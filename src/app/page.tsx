import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getCurrentUser } from "@/server/services/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F6F3] text-[#1B1B18]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="anim-aurora absolute left-1/2 top-[-220px] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(19,167,126,0.22)_0%,rgba(246,246,243,0)_66%)]" />
        <div className="anim-aurora2 absolute right-[-120px] top-[120px] h-[420px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(20,130,190,0.14)_0%,rgba(246,246,243,0)_64%)]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-[linear-gradient(135deg,#10A57C,#0B8366)] text-[18px] font-semibold text-white shadow-[0_2px_8px_rgba(14,159,119,0.35)]">
              æ
            </span>
            <span className="text-xl font-semibold tracking-[-0.02em]">Aethermind</span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-[10px] border border-[#ECECE8] bg-white px-4 py-2 text-sm font-semibold text-[#3A3A36] transition hover:bg-[#F0F0EC]"
              >
                Dashboard
              </Link>
              <LogoutButton variant="light" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-[10px] border border-[#ECECE8] bg-white px-4 py-2 text-sm font-semibold text-[#3A3A36] transition hover:bg-[#F0F0EC]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-[10px] bg-[#0E9F77] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B8366]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1480px] items-center justify-center px-6 pb-20 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0E9F77]">AI SaaS Platform</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Build, manage, and scale AI workflows in one secure workspace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#6E6E68] sm:text-lg">
            Aethermind unifies code, audio, image, video, and conversation tools with account-level
            history and usage tracking built for a real SaaS product.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className="mt-10 inline-flex h-12 items-center justify-center rounded-[12px] bg-[#0E9F77] px-8 text-base font-semibold text-white shadow-[0_14px_30px_-16px_rgba(11,122,94,0.6)] transition hover:bg-[#0B8366]"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
