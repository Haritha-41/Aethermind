"use client";

type AiPromptComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  tip: string;
  errorMessage?: string | null;
  submitBadge?: string | number;
  clearLabel?: string;
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
  clearLabel = "Clear prompt",
}: AiPromptComposerProps) {
  return (
    <>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="rounded-2xl border border-[#2d313a] bg-[#111215] shadow-lg focus-within:border-[#14b8a6] focus-within:ring-1 focus-within:ring-[#14b8a6] transition-all">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full min-h-[76px] bg-transparent text-[13px] text-slate-200 resize-none outline-none p-4 placeholder-slate-500"
          rows={2}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChange("")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-[#18191e] hover:text-slate-300 transition-colors"
              title={clearLabel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => void onSubmit()}
            disabled={isSubmitting || !value.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#14b8a6] pl-4 pr-3 py-1.5 text-xs font-semibold text-[#0f1115] transition-colors hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(20,184,166,0.3)]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border border-black border-t-transparent" />
                {submittingLabel}
              </span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {submitLabel}
                {submitBadge !== undefined ? (
                  <span className="ml-1 bg-[#0f1115]/10 rounded px-1.5 py-0.5 text-[10px] font-bold">
                    {submitBadge}
                  </span>
                ) : null}
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-500">{tip}</p>
    </>
  );
}
