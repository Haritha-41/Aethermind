import { NextResponse } from "next/server";

import { enforceRateLimit, getRequestIp } from "@/server/security/rate-limit";
import { createAiErrorResponse } from "@/server/services/ai/http";
import { deleteAudioGenerationForUser } from "@/server/services/ai/audio-service";
import { getCurrentUser } from "@/server/services/auth/current-user";
import { generationParamsSchema } from "@/server/validation/ai";

type RouteContext = {
  params: Promise<{ generationId: string }>;
};

function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  const rateLimit = enforceRateLimit({
    key: `ai:audio:delete:${user.id}:${getRequestIp(request)}`,
    limit: 25,
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
    const { generationId } = generationParamsSchema.parse(await context.params);
    await deleteAudioGenerationForUser(user.id, generationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createAiErrorResponse("session", error);
  }
}

