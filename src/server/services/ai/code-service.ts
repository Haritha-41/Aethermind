import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  CodeGenerationHistoryItemDto,
  CodeGenerationResultDto,
  CodeUsageDto,
} from "@/types/ai";

import type { CodeGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listCodeHistoryForUser(
  userId: string,
  limit: number,
): Promise<{
  history: CodeGenerationHistoryItemDto[];
  usage: CodeUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const [history, usage] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind),
      {
        serverAccessKey,
        userId,
        kind: "code",
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
    CodeUsageDto,
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

export async function generateCodeForUser(
  userId: string,
  input: CodeGenerationInput,
): Promise<{
  generation: CodeGenerationResultDto;
  usage: CodeUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const generation = (await convexClient.action(
      toConvexActionReference(convexFunctions.ai.generateCodeWithGemini),
      {
        serverAccessKey,
        userId,
        prompt: input.prompt,
        model: input.model,
      },
    )) as CodeGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.code.generation.success", {
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
    logger.warn("ai.code.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
