"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AiErrorDto,
  TextGenerationHistoryItemDto,
  TextGenerationResponseDto,
  TextHistoryResponseDto,
  TextUsageDto,
} from "@/types/ai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_HISTORY_LIMIT = 10;

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-[#2d313a] bg-[linear-gradient(135deg,#1c2130_0%,#141822_100%)] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

async function parseAiErrorResponse(response: Response): Promise<AiErrorDto> {
  try {
    return (await response.json()) as AiErrorDto;
  } catch {
    return {
      error: `Request failed with status ${response.status}.`,
    };
  }
}

function formatDateTime(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestampMs));
}

function renderUsageValue(used: number, limit: number | null): string {
  if (limit === null) {
    return `${used}`;
  }

  return `${used} / ${limit}`;
}

function renderRemainingUsageValue(used: number, limit: number | null): string {
  if (limit === null) {
    return "Unlimited";
  }

  const remaining = Math.max(limit - used, 0);
  return `${remaining} / ${limit}`;
}

export function TextGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<TextGenerationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<TextUsageDto | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        return right.createdAt - left.createdAt;
      }),
    [history],
  );

  const latestEntry = sortedHistory[0] ?? null;

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/text?limit=${DEFAULT_HISTORY_LIMIT}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load text history.");
        return;
      }

      const payload = (await response.json()) as TextHistoryResponseDto;
      setHistory(payload.history);
      setUsage(payload.usage);
      if (!result && payload.history[0]) {
        setResult(payload.history[0].output);
      }
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [result]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function handleGenerate() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Text generation failed.");
        return;
      }

      const payload = (await response.json()) as TextGenerationResponseDto;
      setResult(payload.generation.output);
      setUsage(payload.usage);
      setPrompt("");
      await loadHistory();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Text Generation</h2>
        <p className="mt-1 text-sm text-slate-400">
          Generate polished text responses with a wider workspace and persistent output history.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="text-prompt">
              Prompt
            </label>
            <textarea
              id="text-prompt"
              value={prompt}
              required
              minLength={5}
              maxLength={4000}
              rows={5}
              onChange={(event) => setPrompt(event.target.value)}
              className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-3 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
              placeholder="Describe the text you want to generate in detail..."
            />

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-sm">
                <label
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  htmlFor="text-model"
                >
                  Model
                </label>
                <input
                  id="text-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-2.5 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#14b8a6] px-6 text-sm font-semibold text-[#0f1115] transition hover:bg-[#2dd4bf] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Generating..." : "Generate text"}
              </button>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                {errorMessage}
              </p>
            ) : null}
          </article>

          <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
            <h3 className="text-base font-semibold text-slate-100">Latest Output</h3>
            {result ? (
              <pre className="mt-4 max-h-[26rem] overflow-auto whitespace-pre-wrap rounded-lg border border-[#2d313a] bg-[#0f1115] p-4 text-sm leading-7 text-slate-200">
                {result}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No output yet. Generate text to see results.</p>
            )}
          </article>

          <article className="overflow-hidden rounded-xl border border-[#2d313a] bg-[#171b25]">
            <header className="flex items-center justify-between border-b border-[#2d313a] px-6 py-4">
              <h3 className="text-base font-semibold text-slate-100">Recent Text Generations</h3>
              <button
                type="button"
                onClick={() => {
                  void loadHistory();
                }}
                className="text-sm text-[#14b8a6] hover:text-[#2dd4bf]"
              >
                Refresh
              </button>
            </header>
            {isLoadingHistory ? (
              <p className="px-6 py-5 text-sm text-slate-500">Loading history...</p>
            ) : sortedHistory.length === 0 ? (
              <p className="px-6 py-5 text-sm text-slate-500">No text generations yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#2d313a] text-left">
                  <thead className="bg-[#141925] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Prompt</th>
                      <th className="px-6 py-3 font-medium">Model</th>
                      <th className="px-6 py-3 font-medium">Tokens</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242833] text-sm text-slate-200">
                    {sortedHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="max-w-xl px-6 py-4">
                          <p className="line-clamp-2 text-slate-200">{entry.prompt}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{entry.output}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{entry.model}</td>
                        <td className="px-6 py-4 text-slate-300">{entry.tokensUsed ?? "N/A"}</td>
                        <td className="px-6 py-4 text-slate-400">{formatDateTime(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-4">
          <MetricCard
            label="Plan"
            value={usage?.planKey.toUpperCase() ?? "BASIC"}
            detail="Active subscription"
          />
          <MetricCard
            label="Remaining Generations"
            value={renderRemainingUsageValue(usage?.generation.used ?? 0, usage?.generation.limit ?? null)}
            detail="Shared monthly quota"
          />
          <MetricCard
            label="Token Usage"
            value={renderUsageValue(usage?.tokens.used ?? 0, usage?.tokens.limit ?? null)}
            detail="Current monthly usage"
          />

          <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Latest Prompt</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {latestEntry?.prompt ? latestEntry.prompt.slice(0, 220) : "No prompts yet."}
              {latestEntry?.prompt && latestEntry.prompt.length > 220 ? "..." : ""}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {latestEntry ? formatDateTime(latestEntry.createdAt) : "Waiting for activity"}
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
