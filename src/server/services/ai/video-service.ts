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
  toConvexMutationReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

function shouldUseReplicateVideoModel(modelInput: string | undefined): boolean {
  return modelInput?.trim().toLowerCase().startsWith("replicate-") ?? false;
}

type VideoActionResult = {
  model: string;
  output: string;
  tokensUsed: number;
  imageStorageId?: string;
};

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
      toConvexQueryReference(convexFunctions.ai.listVideoGenerationsByUser),
      {
        serverAccessKey,
        userId,
        limit,
      },
    ),
    getUsageForUser(userId),
  ])) as [
    Array<{
      id: string;
      prompt: string;
      output: string;
      model: string;
      videoUrl: string | null;
      tokensUsed?: number;
      createdAt: number;
    }>,
    VideoUsageDto,
  ];

  return {
    history: history.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      output: item.output,
      model: item.model,
      videoUrl: item.videoUrl,
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
    const useReplicate = shouldUseReplicateVideoModel(input.model);
    const actionRef = useReplicate
      ? convexFunctions.ai.generateVideoWithReplicate
      : convexFunctions.ai.generateVideoWithGemini;
    const actionResult = (await convexClient.action(
      toConvexActionReference(actionRef),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
        aspectRatio: input.aspectRatio,
      },
    )) as VideoActionResult;

    const videoUrl =
      actionResult.imageStorageId
        ? ((await convexClient.query(
            toConvexQueryReference(convexFunctions.ai.getImageStorageUrl),
            { serverAccessKey, storageId: actionResult.imageStorageId },
          )) as string | null)
        : null;

    const generation: VideoGenerationResultDto = {
      model: actionResult.model,
      output: actionResult.output,
      tokensUsed: actionResult.tokensUsed,
      videoUrl,
    };

    const usage = await getUsageForUser(userId);
    logger.info("ai.video.generation.success", {
      userId,
      model: generation.model,
      aspectRatio: input.aspectRatio ?? "16:9",
      outputLength: generation.output.length,
      tokensUsed: generation.tokensUsed,
    });

    return {
      generation,
      usage,
    };
  } catch (error) {
    const serviceError = toAiServiceError(error, {
      modelSuggestion: shouldUseReplicateVideoModel(input.model)
        ? "replicate-video"
        : "gemini-2.5-flash",
    });
    logger.warn("ai.video.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}

export async function deleteVideoGenerationForUser(
  userId: string,
  generationId: string,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    await convexClient.mutation(toConvexMutationReference(convexFunctions.ai.deleteGeneration), {
      serverAccessKey,
      userId,
      kind: "video",
      generationId,
    });
    logger.info("ai.video.generation.deleted", { userId, generationId });
  } catch (error) {
    const serviceError = toAiServiceError(error);
    logger.warn("ai.video.generation.delete_failed", {
      userId,
      generationId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
