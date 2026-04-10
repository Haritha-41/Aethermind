import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/services/auth/current-user";
import {
  createAdminErrorResponse,
  createInvalidJsonResponse,
} from "@/server/services/admin/http";
import { updateUserPlanAsAdmin } from "@/server/services/admin/admin-service";
import { adminUpdateUserPlanSchema, adminUserIdSchema } from "@/server/validation/admin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const adminUser = await getCurrentUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!adminUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  try {
    const { userId } = adminUserIdSchema.parse(await context.params);
    const input = adminUpdateUserPlanSchema.parse(body);

    await updateUserPlanAsAdmin(adminUser.id, userId, input);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse("update_plan", error);
  }
}
