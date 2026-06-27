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
        <label className="mb-1 block text-sm font-medium text-[#33332E]" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={state.email}
          onChange={(event) => setState((prev) => ({ ...prev, email: event.target.value }))}
          className="w-full rounded-[10px] border border-[#E6E6E1] bg-white px-4 py-2.5 text-sm text-[#1B1B18] outline-none placeholder:text-[#A6A69E] focus:border-[#0E9F77]"
          placeholder="name@company.com"
        />
        {fieldErrors?.email?.[0] ? (
          <p className="mt-1 text-xs text-[#B3473D]">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#33332E]" htmlFor="password">
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
            className="w-full rounded-[10px] border border-[#E6E6E1] bg-white px-4 py-2.5 pr-20 text-sm text-[#1B1B18] outline-none placeholder:text-[#A6A69E] focus:border-[#0E9F77]"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((previous) => !previous)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#9A9A92] transition hover:text-[#6E6E68]"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors?.password?.[0] ? (
          <p className="mt-1 text-xs text-[#B3473D]">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-[#6E6E68]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#E6E6E1] accent-[#0E9F77]"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          className="text-sm font-semibold text-[#0E9F77] transition hover:text-[#0B8366]"
        >
          Forgot password?
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-[10px] border border-[#F0C9C4] bg-[#FBECEC] px-3 py-2 text-sm text-[#B3473D]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[10px] bg-[#0E9F77] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B8366] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
