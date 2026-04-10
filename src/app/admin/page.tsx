import { AdminDashboardPanel } from "@/features/admin/components/admin-dashboard-panel";
import { requireAdminUser } from "@/server/services/auth/current-user";

export default async function AdminPage() {
  await requireAdminUser();

  return <AdminDashboardPanel />;
}
