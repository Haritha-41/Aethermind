import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/server/logging/logger";

import { AuthServiceError } from "./auth-service";

export function createInvalidJsonResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
}

export function createAuthErrorResponse(
  action: "login" | "signup" | "logout",
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

  if (error instanceof AuthServiceError) {
    logger.warn(`auth.${action}.failed`, {
      code: error.code,
      statusCode: error.statusCode,
    });
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  logger.error(`auth.${action}.unexpected_error`, {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
