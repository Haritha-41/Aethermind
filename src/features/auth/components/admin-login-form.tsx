"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { AuthErrorDto } from "@/types/auth";

type AdminLoginState = {
  email: string;
  password: string;
};

const DEFAULT_STATE: AdminLoginState = {
  email: "",
  password: "",
};

async function parseAuthErrorResponse(response: Response): Promise<AuthErrorDto> {
  try {
    return (await response.json()) as AuthErrorDto;
  } catch {
    return {
      error: `Request failed with status ${response.status}.`,
    };
  }
}

export function AdminLoginForm() {
  const router = useRouter();
  const [state, setState] = useState<AdminLoginState>(DEFAULT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthErrorDto["details"]>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const errorPayload = await parseAuthErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not sign in as admin.");
        setFieldErrors(errorPayload.details ?? {});
        return;
      }

      const nextPath =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("next");
      const destination = nextPath && nextPath.startsWith("/") ? nextPath : "/admin";

      router.push(destination);
      router.refresh();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-[#d1d5db]" htmlFor="email">
          Admin email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={state.email}
          onChange={(event) => setState((prev) => ({ ...prev, email: event.target.value }))}
          className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-2.5 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
          placeholder="admin@company.com"
        />
        {fieldErrors?.email?.[0] ? (
          <p className="mt-1 text-xs text-rose-400">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#d1d5db]" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            required
            autoComplete="current-password"
            value={state.password}
            onChange={(event) =>
              setState((prev) => ({ ...prev, password: event.target.value }))
            }
            className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-2.5 pr-20 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
            placeholder="********"
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((previous) => !previous)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#9ca3af] transition hover:text-[#d1d5db]"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors?.password?.[0] ? (
          <p className="mt-1 text-xs text-rose-400">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-[#14b8a6] px-4 py-2.5 text-sm font-medium text-[#0f1115] transition hover:bg-[#2dd4bf] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in to Admin"}
      </button>

      <p className="text-center text-xs text-[#9ca3af]">
        Need access? Grant admin via Convex `admins` table or admin mutation.
      </p>

      <div className="text-center text-sm">
        <Link href="/dashboard" className="text-[#14b8a6] hover:text-[#2dd4bf]">
          Back to dashboard
        </Link>
      </div>
    </form>
  );
}
