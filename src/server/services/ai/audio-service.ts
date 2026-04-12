import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  AudioGenerationHistoryItemDto,
  AudioGenerationResultDto,
  AudioUsageDto,
} from "@/types/ai";

import type { AudioGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexMutationReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

function shouldUseReplicateAudioModel(modelInput: string | undefined): boolean {
  return modelInput?.trim().toLowerCase().startsWith("replicate-") ?? false;
}

type AudioActionResult = {
  model: string;
  output: string;
  tokensUsed: number;
  imageStorageId?: string;
};

export async function listAudioHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: AudioGenerationHistoryItemDto[];
  usage: AudioUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listAudioGenerationsByUser),
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
      audioUrl: string | null;
      tokensUsed?: number;
      createdAt: number;
    }>,
    AudioUsageDto,
  ];

  return {
    history: history.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      output: item.output,
      model: item.model,
      audioUrl: item.audioUrl,
      tokensUsed: item.tokensUsed ?? null,
      createdAt: item.createdAt,
    })),
    usage,
  };
}

export async function generateAudioForUser(
  userId: string,
  input: AudioGenerationInput,
): Promise<{
  generation: AudioGenerationResultDto;
  usage: AudioUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const useReplicate = shouldUseReplicateAudioModel(input.model);
    const actionRef = useReplicate
      ? convexFunctions.ai.generateAudioWithReplicate
      : convexFunctions.ai.generateAudioWithGemini;
    const actionResult = (await convexClient.action(
      toConvexActionReference(actionRef),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
        voiceStyle: input.voiceStyle,
      },
    )) as AudioActionResult;

    const audioUrl =
      actionResult.imageStorageId
        ? ((await convexClient.query(
            toConvexQueryReference(convexFunctions.ai.getImageStorageUrl),
            { serverAccessKey, storageId: actionResult.imageStorageId },
          )) as string | null)
        : null;

    const generation: AudioGenerationResultDto = {
      model: actionResult.model,
      output: actionResult.output,
      tokensUsed: actionResult.tokensUsed,
      audioUrl,
    };

    const usage = await getUsageForUser(userId);
    logger.info("ai.audio.generation.success", {
      userId,
      model: generation.model,
      voiceStyle: input.voiceStyle ?? "balanced",
      outputLength: generation.output.length,
      tokensUsed: generation.tokensUsed,
    });

    return {
      generation,
      usage,
    };
  } catch (error) {
    const serviceError = toAiServiceError(error, {
      modelSuggestion: shouldUseReplicateAudioModel(input.model)
        ? "replicate-audio"
        : "gemini-2.5-flash",
    });
    logger.warn("ai.audio.generation.failed", {
      userId,
      voiceStyle: input.voiceStyle ?? "balanced",
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}

export async function deleteAudioGenerationForUser(
  userId: string,
  generationId: string,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    await convexClient.mutation(toConvexMutationReference(convexFunctions.ai.deleteGeneration), {
      serverAccessKey,
      userId,
      kind: "audio",
      generationId,
    });
    logger.info("ai.audio.generation.deleted", { userId, generationId });
  } catch (error) {
    const serviceError = toAiServiceError(error);
    logger.warn("ai.audio.generation.delete_failed", {
      userId,
      generationId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
