"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { AuthErrorDto } from "@/types/auth";

type LoginState = {
  email: string;
  password: string;
};

const DEFAULT_STATE: LoginState = {
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

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>(DEFAULT_STATE);
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const errorPayload = await parseAuthErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not sign in.");
        setFieldErrors(errorPayload.details ?? {});
        return;
      }

      const nextPath =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("next");
      const destination =
        nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

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
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={state.email}
          onChange={(event) => setState((prev) => ({ ...prev, email: event.target.value }))}
          className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-2.5 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
          placeholder="name@company.com"
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
            placeholder="••••••••"
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

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-[#9ca3af]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#2d333b] bg-[#0f1115] text-[#14b8a6] focus:ring-[#14b8a6]"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          className="text-sm font-medium text-[#14b8a6] transition hover:text-[#2dd4bf]"
        >
          Forgot password?
        </button>
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
