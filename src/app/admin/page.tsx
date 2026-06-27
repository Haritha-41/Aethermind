import Link from "next/link";

import { AdminDashboardPanel } from "@/features/admin/components/admin-dashboard-panel";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireAdminUser } from "@/server/services/auth/current-user";

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <main className="h-screen overflow-y-auto bg-[#F6F6F3] text-[#1B1B18]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ECECE8] bg-white/90 px-7 py-3 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-[10px]">
          <div className="relative h-7 w-7 overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,#10A57C,#0B8366)]">
            <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-white">æ</div>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Aethermind</span>
        </Link>
        <div className="flex items-center gap-[10px]">
          <Link
            href="/dashboard"
            className="rounded-[9px] border border-[#ECECE8] bg-white px-[13px] py-2 text-[13px] font-semibold text-[#3A3A36] transition-colors hover:bg-[#F6F6F3]"
          >
            Back to dashboard
          </Link>
          <LogoutButton variant="light" />
        </div>
      </header>
      <AdminDashboardPanel />
    </main>
  );
}
