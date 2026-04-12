import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/server/logging/logger";

import { AiServiceError } from "./shared";

export function createInvalidJsonResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
}

export function createAiErrorResponse(
  action: "generate" | "history" | "session",
  error: unknown,
): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (error instanceof AiServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  logger.error(`ai.${action}.unexpected_error`, {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
