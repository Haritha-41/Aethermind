import { NextResponse } from "next/server";

import { enforceRateLimit, getRequestIp } from "@/server/security/rate-limit";
import {
  createAiErrorResponse,
  createInvalidJsonResponse,
} from "@/server/services/ai/http";
import {
  deleteConversationSessionForUser,
  updateConversationSessionTitleForUser,
} from "@/server/services/ai/conversation-service";
import { getCurrentUser } from "@/server/services/auth/current-user";
import { sessionParamsSchema, updateSessionSchema } from "@/server/validation/ai";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  const rateLimit = enforceRateLimit({
    key: `ai:conversation:sessions:update:${user.id}:${getRequestIp(request)}`,
    limit: 30,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  try {
    const { sessionId } = sessionParamsSchema.parse(await context.params);
    const input = updateSessionSchema.parse(body);
    const session = await updateConversationSessionTitleForUser(user.id, sessionId, input.title);
    return NextResponse.json({ session });
  } catch (error) {
    return createAiErrorResponse("session", error);
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  const rateLimit = enforceRateLimit({
    key: `ai:conversation:sessions:delete:${user.id}:${getRequestIp(request)}`,
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

  try {
    const { sessionId } = sessionParamsSchema.parse(await context.params);
    await deleteConversationSessionForUser(user.id, sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createAiErrorResponse("session", error);
  }
}
