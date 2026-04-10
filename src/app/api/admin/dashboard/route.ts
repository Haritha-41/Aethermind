import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/services/auth/current-user";
import { createAdminErrorResponse } from "@/server/services/admin/http";
import { getAdminDashboardSnapshot } from "@/server/services/admin/admin-service";
import { adminDashboardQuerySchema } from "@/server/validation/admin";

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!user.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = adminDashboardQuerySchema.parse({
      days: searchParams.get("days") ?? undefined,
      generationKind: searchParams.get("generationKind") ?? undefined,
    });

    const payload = await getAdminDashboardSnapshot(query);
    return NextResponse.json(payload);
  } catch (error) {
    return createAdminErrorResponse("dashboard", error);
  }
}
