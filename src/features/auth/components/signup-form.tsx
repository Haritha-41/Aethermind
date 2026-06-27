"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { AuthErrorDto } from "@/types/auth";

type SignupState = {
  name: string;
  email: string;
  password: string;
};

const DEFAULT_STATE: SignupState = {
  name: "",
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

export function SignupForm() {
  const router = useRouter();
  const [state, setState] = useState<SignupState>(DEFAULT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthErrorDto["details"]>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      email: state.email,
      password: state.password,
      name: state.name.trim() || undefined,
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await parseAuthErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not create account.");
        setFieldErrors(errorPayload.details ?? {});
        return;
      }

      router.push("/dashboard");
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
        <label className="mb-1 block text-sm font-medium text-[#33332E]" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          autoComplete="name"
          value={state.name}
          onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
          className="w-full rounded-[10px] border border-[#E6E6E1] bg-white px-4 py-2.5 text-sm text-[#1B1B18] outline-none placeholder:text-[#A6A69E] focus:border-[#0E9F77]"
          placeholder="Jane Doe"
        />
        {fieldErrors?.name?.[0] ? (
          <p className="mt-1 text-xs text-[#B3473D]">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

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
            autoComplete="new-password"
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
