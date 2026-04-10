import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import type { DashboardSectionKey } from "@/features/dashboard/config/dashboard-navigation";
import { requireCurrentUser } from "@/server/services/auth/current-user";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const validSections = new Set<DashboardSectionKey>([
  "dashboard",
  "text",
  "code",
  "image",
  "video",
  "conversation",
]);

function getActiveSection(value: string | string[] | undefined): DashboardSectionKey {
  const rawSection = Array.isArray(value) ? value[0] : value;
  if (!rawSection) {
    return "dashboard";
  }

  return validSections.has(rawSection as DashboardSectionKey)
    ? (rawSection as DashboardSectionKey)
    : "dashboard";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeSection = getActiveSection(resolvedSearchParams.section);

  return <DashboardShell user={user} activeSection={activeSection} />;
}
