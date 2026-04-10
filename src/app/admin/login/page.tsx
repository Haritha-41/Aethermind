import { AdminLoginForm } from "@/features/auth/components/admin-login-form";
import { getCurrentUser } from "@/server/services/auth/current-user";
import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.isAdmin) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1115] px-4 py-12">
      <section className="w-full max-w-md overflow-hidden rounded-xl border border-[#2d333b] bg-[#16181d] shadow-2xl shadow-black/30">
        <header className="border-b border-[#2d333b] px-8 py-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#14b8a6] text-xs font-bold text-[#0f1115]">
              A
            </span>
            <span className="text-2xl font-bold text-[#f3f4f6]">Aethermind Admin</span>
          </div>
          <h1 className="text-center text-2xl font-semibold text-[#f3f4f6]">Admin login</h1>
          <p className="mt-1 text-center text-sm text-[#9ca3af]">
            Authenticate with an admin-enabled account.
          </p>
        </header>

        <div className="space-y-6 px-8 py-6">
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
