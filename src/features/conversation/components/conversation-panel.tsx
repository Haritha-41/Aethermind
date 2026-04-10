"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AiErrorDto,
  ConversationHistoryItemDto,
  ConversationHistoryResponseDto,
  ConversationResponseDto,
  ConversationUsageDto,
} from "@/types/ai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_HISTORY_LIMIT = 20;

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

export function ConversationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [history, setHistory] = useState<ConversationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<ConversationUsageDto | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const threadBottomRef = useRef<HTMLDivElement | null>(null);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        return left.createdAt - right.createdAt;
      }),
    [history],
  );

  const latestReply = sortedHistory[sortedHistory.length - 1]?.output ?? null;

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/conversation?limit=${DEFAULT_HISTORY_LIMIT}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load conversation history.");
        return;
      }

      const payload = (await response.json()) as ConversationHistoryResponseDto;
      setHistory(payload.history);
      setUsage(payload.usage);
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (threadBottomRef.current) {
      threadBottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [sortedHistory, isLoadingHistory]);

  async function handleSendMessage() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Conversation message failed.");
        return;
      }

      const payload = (await response.json()) as ConversationResponseDto;
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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Conversation</h2>
        <p className="mt-1 text-sm text-slate-400">
          Chat in a persistent thread with private per-account history.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <article className="overflow-hidden rounded-xl border border-[#2d313a] bg-[#171b25]">
            <header className="flex items-center justify-between border-b border-[#2d313a] px-6 py-4">
              <h3 className="text-base font-semibold text-slate-100">Conversation</h3>
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
              <p className="px-6 py-5 text-sm text-slate-500">Loading conversation...</p>
            ) : sortedHistory.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-400">No messages yet. Start the conversation below.</p>
              </div>
            ) : (
              <div className="h-[58vh] overflow-y-auto px-4 py-4 sm:px-6">
                <div className="space-y-4">
                  {sortedHistory.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#24555f] bg-[#11353c] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-[#7ed4c9]">You</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-100">{entry.prompt}</p>
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[#2d313a] bg-[#0f1115] px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-[#14b8a6]">Assistant</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">{entry.output}</p>
                          <p className="mt-3 text-xs text-slate-500">
                            {formatDateTime(entry.createdAt)} | {entry.model} | tokens: {entry.tokensUsed ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={threadBottomRef} />
                </div>
              </div>
            )}
          </article>

          <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="conversation-prompt">
              Message
            </label>
            <textarea
              id="conversation-prompt"
              value={prompt}
              required
              minLength={1}
              maxLength={4000}
              rows={4}
              onChange={(event) => setPrompt(event.target.value)}
              className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-3 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
              placeholder="Ask anything about your project, content, or workflow..."
            />

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleSendMessage();
                }}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#14b8a6] px-6 text-sm font-semibold text-[#0f1115] transition hover:bg-[#2dd4bf] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                {errorMessage}
              </p>
            ) : null}
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
            <label
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
              htmlFor="conversation-model"
            >
              Model
            </label>
            <input
              id="conversation-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-4 py-2.5 text-sm text-[#f3f4f6] shadow-sm outline-none placeholder:text-[#6b7280] focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]"
            />
            <p className="mt-2 text-xs text-slate-500">Used for every new assistant reply.</p>
          </article>

          <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Latest Reply</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {latestReply ? latestReply.slice(0, 260) : "No reply yet. Send a message to start."}
              {latestReply && latestReply.length > 260 ? "..." : ""}
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
