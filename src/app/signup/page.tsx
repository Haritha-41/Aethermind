import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthSocialButtons } from "@/features/auth/components/auth-social-buttons";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getCurrentUser } from "@/server/services/auth/current-user";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F6F3] px-4 py-12 text-[#1B1B18]">
      <section className="w-full max-w-md overflow-hidden rounded-[22px] border border-[#ECECE8] bg-white shadow-[0_24px_60px_-24px_rgba(20,20,18,0.2)]">
        <header className="border-b border-[#ECECE8] px-8 py-8">
          <div className="mb-4 flex items-center justify-center gap-[10px]">
            <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,#10A57C,#0B8366)] text-[16px] font-semibold text-white">
              æ
            </span>
            <span className="text-2xl font-semibold tracking-[-0.02em]">Aethermind</span>
          </div>
          <h1 className="text-center text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-center text-sm text-[#9A9A92]">
            Start with a secure account to access protected SaaS features.
          </p>
        </header>

        <div className="space-y-6 px-8 py-6">
          <SignupForm />
          <AuthSocialButtons />
        </div>

        <footer className="border-t border-[#ECECE8] px-6 py-5 text-center text-sm text-[#9A9A92]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#0E9F77] hover:text-[#0B8366]">
            Sign in
          </Link>
        </footer>
      </section>
    </main>
  );
}
