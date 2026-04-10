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
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

type ImageActionResult = {
  model: string;
  output: string;
  tokensUsed: number;
  imageStorageId: string;
};

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
    const actionResult = (await convexClient.action(
      toConvexActionReference(convexFunctions.ai.generateImageWithGemini),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
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
      modelSuggestion: "gemini-2.5-flash-image",
    });
    logger.warn("ai.image.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
