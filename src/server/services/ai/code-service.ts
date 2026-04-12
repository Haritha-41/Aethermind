import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import { getConvexServerAccessKey } from "@/lib/config/env";
import type {
  AiSessionDto,
  CodeGenerationHistoryItemDto,
  CodeGenerationResultDto,
  CodeUsageDto,
} from "@/types/ai";

import type { CodeGenerationInput } from "@/server/validation/ai";

import {
  getUsageForUser,
  toAiServiceError,
  toConvexActionReference,
  toConvexMutationReference,
  toConvexQueryReference,
} from "./shared";

export { AiServiceError } from "./shared";

export async function listCodeHistoryForUser(
  userId: string,
  limit: number,
  sessionId?: string,
): Promise<{
  sessionId: string | null;
  history: CodeGenerationHistoryItemDto[];
  usage: CodeUsageDto;
}> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const historyPromise = sessionId
    ? convexClient.query(toConvexQueryReference(convexFunctions.ai.listGenerationsBySession), {
        serverAccessKey,
        userId,
        kind: "code",
        sessionId,
        limit,
      })
    : convexClient.query(toConvexQueryReference(convexFunctions.ai.listGenerationsByUserAndKind), {
        serverAccessKey,
        userId,
        kind: "code",
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
    CodeUsageDto,
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

export async function listCodeSessionsForUser(userId: string, limit: number): Promise<AiSessionDto[]> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const sessions = (await convexClient.query(
    toConvexQueryReference(convexFunctions.ai.listSessionsByUserAndKind),
    {
      serverAccessKey,
      userId,
      kind: "code",
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

export async function createCodeSessionForUser(userId: string, title?: string): Promise<AiSessionDto> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const sessionId = (await convexClient.mutation(
    toConvexMutationReference(convexFunctions.ai.createSession),
    {
      serverAccessKey,
      userId,
      kind: "code",
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
    throw new Error("Code session creation failed.");
  }

  return {
    id: createdSession._id,
    kind: createdSession.kind,
    title: createdSession.title,
    createdAt: createdSession.createdAt,
    lastActivityAt: createdSession.lastActivityAt,
  };
}

export async function updateCodeSessionTitleForUser(
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
      kind: "code",
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
    throw new Error("Code session update failed.");
  }

  return {
    id: updatedSession._id,
    kind: updatedSession.kind,
    title: updatedSession.title,
    createdAt: updatedSession.createdAt,
    lastActivityAt: updatedSession.lastActivityAt,
  };
}

export async function deleteCodeSessionForUser(userId: string, sessionId: string): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  await convexClient.mutation(toConvexMutationReference(convexFunctions.ai.deleteSession), {
    serverAccessKey,
    userId,
    kind: "code",
    sessionId,
  });
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
        sessionId: input.sessionId,
      },
    )) as CodeGenerationResultDto;

    const usage = await getUsageForUser(userId);
    logger.info("ai.code.generation.success", {
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
    logger.warn("ai.code.generation.failed", {
      userId,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
    });
    throw serviceError;
  }
}
