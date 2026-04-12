import { NextResponse } from "next/server";

import { enforceRateLimit, getRequestIp } from "@/server/security/rate-limit";
import {
  createAiErrorResponse,
  createInvalidJsonResponse,
} from "@/server/services/ai/http";
import {
  createCodeSessionForUser,
  listCodeSessionsForUser,
} from "@/server/services/ai/code-service";
import { getCurrentUser } from "@/server/services/auth/current-user";
import { createSessionSchema, sessionListQuerySchema } from "@/server/validation/ai";

function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = sessionListQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
    });
    const sessions = await listCodeSessionsForUser(user.id, query.limit);
    return NextResponse.json({ sessions });
  } catch (error) {
    return createAiErrorResponse("history", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  const rateLimit = enforceRateLimit({
    key: `ai:code:sessions:${user.id}:${getRequestIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  try {
    const input = createSessionSchema.parse(body);
    const session = await createCodeSessionForUser(user.id, input.title);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return createAiErrorResponse("generate", error);
  }
}

