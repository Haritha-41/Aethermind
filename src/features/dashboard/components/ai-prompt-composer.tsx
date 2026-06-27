"use client";

type AiPromptComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  tip?: string;
  errorMessage?: string | null;
  submitBadge?: string | number;
  /** Accent color for the send button. Defaults to emerald. */
  accent?: string;
  /** "icon" = compact arrow button (chat/code); "label" = wide Generate button. */
  variant?: "icon" | "label";
};

export function AiPromptComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  isSubmitting,
  submitLabel,
  submittingLabel,
  tip,
  errorMessage,
  submitBadge,
  accent = "#0E9F77",
  variant = "label",
}: AiPromptComposerProps) {
  const isDisabled = isSubmitting || !value.trim();

  return (
    <>
      {errorMessage ? (
        <div className="mb-3 rounded-xl border border-[#F0C9C4] bg-[#FBECEC] px-4 py-2.5 text-[13px] text-[#B3473D]">
          {errorMessage}
        </div>
      ) : null}

      <div
        className="flex items-end gap-3 rounded-2xl border border-[#E6E6E1] bg-[#F6F6F3] py-[13px] pl-[18px] pr-[14px] transition-colors focus-within:border-[#cfcfc7]"
      >
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!isDisabled) onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="min-h-[28px] flex-1 resize-none bg-transparent py-[5px] text-[14.5px] leading-relaxed text-[#1B1B18] outline-none placeholder:text-[#A6A69E]"
        />

        {variant === "icon" ? (
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={isDisabled}
            style={{ background: accent }}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-white transition-opacity disabled:opacity-50"
            aria-label={submitLabel}
            title={submitLabel}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={isDisabled}
            style={{ background: accent }}
            className="flex h-10 shrink-0 items-center gap-2 rounded-[11px] px-[18px] text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {submittingLabel}
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5Z" />
                </svg>
                {submitLabel}
                {submitBadge !== undefined ? (
                  <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                    {submitBadge}
                  </span>
                ) : null}
              </>
            )}
          </button>
        )}
      </div>

      {tip ? (
        <p className="mt-[9px] text-center text-[11.5px] text-[#B0B0A8]">{tip}</p>
      ) : null}
    </>
  );
}
