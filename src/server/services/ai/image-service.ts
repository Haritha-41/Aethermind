import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  ImageGenerationHistoryItemDto,
  ImageGenerationResultDto,
  ImageUsageDto,
} from "@/types/ai";

import type { ImageGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexMutationReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

type ImageActionResult = {
  model: string;
  output: string;
  tokensUsed: number;
  imageStorageId: string;
  generatedCount?: number;
};

function shouldUseReplicateImageModel(modelInput: string | undefined): boolean {
  return modelInput?.trim().toLowerCase().startsWith("replicate-") ?? false;
}

export async function listImageHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: ImageGenerationHistoryItemDto[];
  usage: ImageUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listImageGenerationsByUser),
      {
        serverAccessKey,
        userId,
        limit,
      },
    ),
    getUsageForUser(userId),
  ])) as [ImageGenerationHistoryItemDto[], ImageUsageDto];

  return {
    history,
    usage,
  };
}

export async function generateImageForUser(
  userId: string,
  input: ImageGenerationInput,
): Promise<{
  generation: ImageGenerationResultDto;
  usage: ImageUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const useReplicate = shouldUseReplicateImageModel(input.model);
    const actionRef = useReplicate
      ? convexFunctions.ai.generateImageWithReplicate
      : convexFunctions.ai.generateImageWithGemini;
    const actionResult = (await convexClient.action(
      toConvexActionReference(actionRef),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
        style: input.style,
        aspectRatio: input.aspectRatio,
        numImages: input.numImages,
      },
    )) as ImageActionResult;

    const imageUrl = (await convexClient.query(
      toConvexQueryReference(convexFunctions.ai.getImageStorageUrl),
      { serverAccessKey, storageId: actionResult.imageStorageId },
    )) as string | null;

    const usage = await getUsageForUser(userId);
    logger.info("ai.image.generation.success", {
      userId,
      model: actionResult.model,
      hasImageUrl: Boolean(imageUrl),
      style: input.style ?? "Photorealistic",
      aspectRatio: input.aspectRatio ?? "1:1",
      generatedCount: actionResult.generatedCount ?? 1,
      tokensUsed: actionResult.tokensUsed,
    });

    return {
      generation: {
        model: actionResult.model,
        output: actionResult.output,
        imageUrl,
        tokensUsed: actionResult.tokensUsed,
      },
      usage,
    };
  } catch (error) {
    const serviceError = toAiServiceError(error, {
      modelSuggestion: shouldUseReplicateImageModel(input.model)
        ? "replicate-image"
        : "gemini-2.5-flash-image",
    });
    logger.warn("ai.image.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}

export async function deleteImageGenerationForUser(
  userId: string,
  generationId: string,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    await convexClient.mutation(toConvexMutationReference(convexFunctions.ai.deleteGeneration), {
      serverAccessKey,
      userId,
      kind: "image",
      generationId,
    });
    logger.info("ai.image.generation.deleted", { userId, generationId });
  } catch (error) {
    const serviceError = toAiServiceError(error);
    logger.warn("ai.image.generation.delete_failed", {
      userId,
      generationId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
