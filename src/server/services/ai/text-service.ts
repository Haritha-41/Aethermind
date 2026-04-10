import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  TextGenerationHistoryItemDto,
  TextGenerationResultDto,
  TextUsageDto,
} from "@/types/ai";

import type { TextGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listTextHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: TextGenerationHistoryItemDto[];
  usage: TextUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind),
      {
        serverAccessKey,
        userId,
        kind: "text",
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
    TextUsageDto,
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

export async function generateTextForUser(
  userId: string,
  input: TextGenerationInput,
): Promise<{
  generation: TextGenerationResultDto;
  usage: TextUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const generation = (await convexClient.action(
      toConvexActionReference(convexFunctions.ai.generateTextWithGemini),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
      },
    )) as TextGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.text.generation.success", {
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
    logger.warn("ai.text.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
