import Link from "next/link";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getCurrentUser } from "@/server/services/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0e14] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.26)_0%,rgba(15,17,21,0)_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,#0f1115_20%,#101521_52%,#0e131d_100%)]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3 text-slate-100 hover:text-slate-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#14b8a6] text-xs font-bold text-[#0f1115]">
              A
            </span>
            <span className="text-xl font-bold tracking-tight">Aethermind</span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg border border-[#2d333b] bg-[#171b25] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#3d4450] hover:text-white"
              >
                Dashboard
              </Link>
              <LogoutButton variant="dark" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-[#2d333b] bg-[#171b25] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#3d4450] hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0f1115] transition hover:bg-[#2dd4bf]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1480px] items-center justify-center px-6 pb-20 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#5eead4]">AI SaaS Platform</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#f8fafc] sm:text-5xl lg:text-6xl">
            Build, manage, and scale AI workflows in one secure workspace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Aethermind unifies code, audio, image, video, and conversation tools with account-level
            history and usage tracking built for a real SaaS product.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-[#14b8a6] px-8 text-base font-semibold text-[#0f1115] transition hover:bg-[#2dd4bf]"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
