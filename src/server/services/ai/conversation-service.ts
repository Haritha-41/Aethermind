import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  ConversationGenerationResultDto,
  ConversationHistoryItemDto,
  ConversationUsageDto,
} from "@/types/ai";

import type { ConversationGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listConversationHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: ConversationHistoryItemDto[];
  usage: ConversationUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind),
      {
        serverAccessKey,
        userId,
        kind: "conversation",
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
    ConversationUsageDto,
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

export async function generateConversationReplyForUser(
  userId: string,
  input: ConversationGenerationInput,
): Promise<{
  generation: ConversationGenerationResultDto;
  usage: ConversationUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const generation = (await convexClient.action(
      toConvexActionReference(convexFunctions.ai.generateConversationReplyWithGemini),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
      },
    )) as ConversationGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.conversation.generation.success", {
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
    logger.warn("ai.conversation.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
