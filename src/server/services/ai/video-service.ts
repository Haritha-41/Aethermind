import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  VideoGenerationHistoryItemDto,
  VideoGenerationResultDto,
  VideoUsageDto,
} from "@/types/ai";

import type { VideoGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listVideoHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: VideoGenerationHistoryItemDto[];
  usage: VideoUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind),
      {
        serverAccessKey,
        userId,
        kind: "video",
        limit,
      },
    ),
    getUsageForUser(userId),
  ])) as [
    Array<{
      _id: string;
      prompt: string;
      output: string;
      model: string;
      tokensUsed?: number;
      createdAt: number;
    }>,
    VideoUsageDto,
  ];

  return {
    history: history.map((item) => ({
      id: item._id,
      prompt: item.prompt,
      output: item.output,
      model: item.model,
      tokensUsed: item.tokensUsed ?? null,
      createdAt: item.createdAt,
    })),
    usage,
  };
}

export async function generateVideoForUser(
  userId: string,
  input: VideoGenerationInput,
): Promise<{
  generation: VideoGenerationResultDto;
  usage: VideoUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const generation = (await convexClient.action(
      toConvexActionReference(convexFunctions.ai.generateVideoWithGemini),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
      },
    )) as VideoGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.video.generation.success", {
      userId,
      model: generation.model,
      outputLength: generation.output.length,
      tokensUsed: generation.tokensUsed,
    });

    return {
      generation,
      usage,
    };
  } catch (error) {
    const serviceError = toAiServiceError(error, {
      modelSuggestion: "gemini-2.5-flash",
    });
    logger.warn("ai.video.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
