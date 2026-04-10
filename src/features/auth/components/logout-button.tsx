"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  variant?: "default" | "dark";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "dark"
          ? "border-[#2d313a] bg-[#11141b] text-slate-200 hover:border-slate-500 hover:text-white"
          : "border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
      }`}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
