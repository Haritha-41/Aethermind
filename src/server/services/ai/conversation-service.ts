import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  AiSessionDto,
  ConversationGenerationResultDto,
  ConversationHistoryItemDto,
  ConversationUsageDto,
} from "@/types/ai";

import type { ConversationGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexMutationReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listConversationHistoryForUser(
  userId: string,
  limit: number,
  sessionId?: string,
): Promise<{
  sessionId: string | null;
  history: ConversationHistoryItemDto[];
  usage: ConversationUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const historyPromise = sessionId
    ? convexClient.query(toConvexQueryReference(convexFunctions.ai.listGenerationsBySession), {
        serverAccessKey,
        userId,
        kind: "conversation",
        sessionId,
        limit,
      })
    : convexClient.query(toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind), {
        serverAccessKey,
        userId,
        kind: "conversation",
        limit,
      });

  const [history, usage] = (await Promise.all([historyPromise, getUsageForUser(userId)])) as [
    Array<{
      _id: string;
      sessionId?: string;
      prompt: string;
      output: string;
      model: string;
      tokensUsed?: number;
      createdAt: number;
    }>,
    ConversationUsageDto,
  ];

  return {
    sessionId: sessionId ?? null,
    history: history.map((item) => ({
      id: item._id,
      sessionId: item.sessionId ?? null,
      prompt: item.prompt,
      output: item.output,
      model: item.model,
      tokensUsed: item.tokensUsed ?? null,
      createdAt: item.createdAt,
    })),
    usage,
  };
}

export async function listConversationSessionsForUser(
  userId: string,
  limit: number,
): Promise<AiSessionDto[]> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const sessions = (await convexClient.query(
    toConvexQueryReference(convexFunctions.ai.listSessionsByUserAndKind),
    {
      serverAccessKey,
      userId,
      kind: "conversation",
      limit,
    },
  )) as Array<{
    _id: string;
    kind: "code" | "conversation";
    title: string;
    createdAt: number;
    lastActivityAt: number;
  }>;

  return sessions.map((session) => ({
    id: session._id,
    kind: session.kind,
    title: session.title,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
  }));
}

export async function createConversationSessionForUser(
  userId: string,
  title?: string,
): Promise<AiSessionDto> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const sessionId = (await convexClient.mutation(
    toConvexMutationReference(convexFunctions.ai.createSession),
    {
      serverAccessKey,
      userId,
      kind: "conversation",
      title,
    },
  )) as string;
  const createdSession = (await convexClient.query(
    toConvexQueryReference(convexFunctions.ai.getSessionById),
    {
      serverAccessKey,
      sessionId,
    },
  )) as
    | {
        _id: string;
        kind: "code" | "conversation";
        title: string;
        createdAt: number;
        lastActivityAt: number;
      }
    | null;

  if (!createdSession) {
    throw new Error("Conversation session creation failed.");
  }

  return {
    id: createdSession._id,
    kind: createdSession.kind,
    title: createdSession.title,
    createdAt: createdSession.createdAt,
    lastActivityAt: createdSession.lastActivityAt,
  };
}

export async function updateConversationSessionTitleForUser(
  userId: string,
  sessionId: string,
  title: string,
): Promise<AiSessionDto> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const updatedSession = (await convexClient.mutation(
    toConvexMutationReference(convexFunctions.ai.updateSessionTitle),
    {
      serverAccessKey,
      userId,
      kind: "conversation",
      sessionId,
      title,
    },
  )) as
    | {
        _id: string;
        kind: "code" | "conversation";
        title: string;
        createdAt: number;
        lastActivityAt: number;
      }
    | null;

  if (!updatedSession) {
    throw new Error("Conversation session update failed.");
  }

  return {
    id: updatedSession._id,
    kind: updatedSession.kind,
    title: updatedSession.title,
    createdAt: updatedSession.createdAt,
    lastActivityAt: updatedSession.lastActivityAt,
  };
}

export async function deleteConversationSessionForUser(
  userId: string,
  sessionId: string,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  await convexClient.mutation(toConvexMutationReference(convexFunctions.ai.deleteSession), {
    serverAccessKey,
    userId,
    kind: "conversation",
    sessionId,
  });
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
        sessionId: input.sessionId,
      },
    )) as ConversationGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.conversation.generation.success", {
      userId,
      sessionId: generation.sessionId,
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
