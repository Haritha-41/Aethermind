import type { ConvexHttpClient } from "convex/browser";

import { getConvexServerAccessKey } from "@/lib/config/env";
import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import type { AiUsageDto } from "@/types/ai";

type ConvexQueryReference = Parameters<ConvexHttpClient["query"]>[0];
type ConvexMutationReference = Parameters<ConvexHttpClient["mutation"]>[0];
type ConvexActionReference = Parameters<ConvexHttpClient["action"]>[0];

type PlanQueryResult = {
  subscription: {
    planKey: string;
    periodStartMs: number;
    periodEndMs: number;
  };
  plan: {
    monthlyGenerationLimit: number;
    monthlyTokenLimit?: number;
  } | null;
} | null;

type UsageSummaryResult = {
  unitsConsumed: number;
  unitsLimit?: number;
} | null;

function getMonthlyPeriod(timestampMs: number): {
  periodStartMs: number;
  periodEndMs: number;
} {
  const date = new Date(timestampMs);
  const periodStartMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const periodEndMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return {
    periodStartMs,
    periodEndMs,
  };
}

function toUsageMetric(
  summary: UsageSummaryResult,
  defaultLimit: number | undefined,
): {
  used: number;
  limit: number | null;
  remaining: number | null;
} {
  const used = summary?.unitsConsumed ?? 0;
  const limit = summary?.unitsLimit ?? defaultLimit ?? null;
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(limit - used, 0),
  };
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export function toConvexQueryReference(functionName: string): ConvexQueryReference {
  return functionName as unknown as ConvexQueryReference;
}

export function toConvexActionReference(functionName: string): ConvexActionReference {
  return functionName as unknown as ConvexActionReference;
}

export function toConvexMutationReference(functionName: string): ConvexMutationReference {
  return functionName as unknown as ConvexMutationReference;
}

export function toAiServiceError(
  error: unknown,
  options?: {
    modelSuggestion?: string;
  },
): AiServiceError {
  if (error instanceof AiServiceError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  if (message.includes("Plan usage limit exceeded")) {
    return new AiServiceError(
      "Plan usage limit reached. Upgrade your plan or try again next billing cycle.",
      403,
      "PLAN_LIMIT_EXCEEDED",
    );
  }

  if (message.includes("GEMINI_API_KEY is not configured")) {
    return new AiServiceError(
      "AI provider is not configured. Contact support.",
      500,
      "AI_PROVIDER_NOT_CONFIGURED",
    );
  }

  if (message.includes("REPLICATE_API_TOKEN is not configured")) {
    return new AiServiceError(
      "Replicate provider is not configured. Contact support.",
      500,
      "AI_PROVIDER_NOT_CONFIGURED",
    );
  }

  if (message.includes("Gemini request failed")) {
    if (message.includes("status 404")) {
      const suggestion = options?.modelSuggestion ? ` Try ${options.modelSuggestion}.` : "";
      return new AiServiceError(
        `Selected model is unavailable for your API key.${suggestion}`.trim(),
        400,
        "AI_MODEL_UNAVAILABLE",
      );
    }

    if (message.includes("status 429")) {
      return new AiServiceError(
        "AI provider rate or quota limit reached. Please retry in a moment.",
        429,
        "AI_RATE_LIMITED",
      );
    }

    return new AiServiceError("AI provider request failed. Please try again.", 502, "AI_UPSTREAM");
  }

  if (message.includes("Gemini request timed out")) {
    return new AiServiceError(
      "AI provider request timed out. Please retry in a moment.",
      504,
      "AI_TIMEOUT",
    );
  }

  if (message.includes("Replicate request timed out")) {
    return new AiServiceError(
      "Replicate request timed out. Please retry in a moment.",
      504,
      "AI_TIMEOUT",
    );
  }

  if (message.includes("Replicate request failed")) {
    if (message.includes("status 422")) {
      return new AiServiceError(
        "Replicate rejected this request input. Try simplifying the prompt or changing model/settings.",
        400,
        "AI_INVALID_INPUT",
      );
    }

    if (message.includes("status 404")) {
      const suggestion = options?.modelSuggestion ? ` Try ${options.modelSuggestion}.` : "";
      return new AiServiceError(
        `Selected model is unavailable for your Replicate key.${suggestion}`.trim(),
        400,
        "AI_MODEL_UNAVAILABLE",
      );
    }

    if (message.includes("status 429") || message.includes("status 402")) {
      return new AiServiceError(
        "Replicate quota or rate limit reached. Please retry in a moment.",
        429,
        "AI_RATE_LIMITED",
      );
    }

    return new AiServiceError("Replicate request failed. Please try again.", 502, "AI_UPSTREAM");
  }

  if (message.includes("Replicate prediction failed")) {
    return new AiServiceError(
      "Replicate generation failed for this prompt/model. Please try a different prompt.",
      502,
      "AI_UPSTREAM",
    );
  }

  if (message.includes("Replicate returned no output media URL")) {
    return new AiServiceError(
      "Replicate did not return any media output. Please try a different model or prompt.",
      502,
      "AI_EMPTY",
    );
  }

  if (message.includes("Replicate media fetch failed") || message.includes("Replicate returned an empty media file")) {
    return new AiServiceError(
      "Generated media could not be retrieved from Replicate. Please try again.",
      502,
      "AI_UPSTREAM",
    );
  }

  if (message.includes("Gemini returned an empty response")) {
    return new AiServiceError("AI returned an empty response. Please try again.", 502, "AI_EMPTY");
  }

  if (message.includes("Gemini returned no image data")) {
    return new AiServiceError(
      "AI image generation returned no image data. Please try a different prompt.",
      502,
      "AI_EMPTY_IMAGE",
    );
  }

  if (message.includes("User account is not active")) {
    return new AiServiceError(
      "Account access is restricted. Contact support.",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }

  if (message.includes("Session does not exist")) {
    return new AiServiceError("The selected session was not found.", 404, "SESSION_NOT_FOUND");
  }

  if (message.includes("Session does not belong to this user")) {
    return new AiServiceError("You do not have access to this session.", 403, "SESSION_FORBIDDEN");
  }

  if (message.includes("Generation does not exist")) {
    return new AiServiceError(
      "The selected generation was not found.",
      404,
      "GENERATION_NOT_FOUND",
    );
  }

  if (message.includes("Generation does not belong to this user")) {
    return new AiServiceError(
      "You do not have access to this generation.",
      403,
      "GENERATION_FORBIDDEN",
    );
  }

  if (message.includes("Generation type mismatch")) {
    return new AiServiceError(
      "Selected generation does not match this section.",
      400,
      "GENERATION_TYPE_MISMATCH",
    );
  }

  return new AiServiceError("Unexpected server error.", 500, "AI_UNEXPECTED");
}

export async function getUsageForUser(userId: string): Promise<AiUsageDto> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const asOfMs = Date.now();
  const planResult = (await convexClient.query(
    toConvexQueryReference(convexFunctions.billing.getCurrentUserPlan),
    {
      serverAccessKey,
      userId,
      asOfMs,
    },
  )) as PlanQueryResult;

  const fallbackPeriod = getMonthlyPeriod(asOfMs);
  const periodStartMs = planResult?.subscription.periodStartMs ?? fallbackPeriod.periodStartMs;
  const periodEndMs = planResult?.subscription.periodEndMs ?? fallbackPeriod.periodEndMs;

  const [generationSummary, tokenSummary] = (await Promise.all([
    convexClient.query(
      toConvexQueryReference(convexFunctions.billing.getUsageSummary),
      { serverAccessKey, userId, metric: "generation", periodStartMs },
    ),
    convexClient.query(
      toConvexQueryReference(convexFunctions.billing.getUsageSummary),
      { serverAccessKey, userId, metric: "tokens", periodStartMs },
    ),
  ])) as [UsageSummaryResult, UsageSummaryResult];

  return {
    planKey: planResult?.subscription.planKey ?? "basic",
    generation: toUsageMetric(generationSummary, planResult?.plan?.monthlyGenerationLimit),
    tokens: toUsageMetric(tokenSummary, planResult?.plan?.monthlyTokenLimit),
    periodStartMs,
    periodEndMs,
  };
}
