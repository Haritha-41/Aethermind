"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  variant?: "default" | "dark" | "light";
  className?: string;
};

export function LogoutButton({ variant = "default", className = "" }: LogoutButtonProps) {
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

  const variantClass =
    variant === "dark"
      ? "border-[#2d313a] bg-[#11141b] text-slate-200 hover:border-slate-500 hover:text-white"
      : variant === "light"
        ? "border-[#ECECE8] bg-white text-[#3A3A36] hover:bg-[#F6F6F3]"
        : "border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900";

  const sizeClass = variant === "light" ? "px-[7px] py-[7px] text-[12px]" : "px-4 py-2 text-sm";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={`rounded-[9px] border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
