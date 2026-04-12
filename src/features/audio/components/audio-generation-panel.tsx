"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import type {
  AiErrorDto,
  AudioGenerationHistoryItemDto,
  AudioGenerationResponseDto,
  AudioHistoryResponseDto,
  AudioUsageDto,
} from "@/types/ai";

const DEFAULT_MODEL = "replicate-audio";
const DEFAULT_VOICE_STYLE = "balanced";
const DEFAULT_HISTORY_LIMIT = 10;
const VOICE_STYLE_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "calm", label: "Calm" },
  { value: "energetic", label: "Energetic" },
  { value: "narrator", label: "Narrator" },
  { value: "dramatic", label: "Dramatic" },
] as const;

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

export function AudioGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [voiceStyle, setVoiceStyle] = useState<(typeof VOICE_STYLE_OPTIONS)[number]["value"]>(
    DEFAULT_VOICE_STYLE,
  );
  const [history, setHistory] = useState<AudioGenerationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<AudioUsageDto | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingGenerationId, setIsDeletingGenerationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        return right.createdAt - left.createdAt;
      }),
    [history],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/audio?limit=${DEFAULT_HISTORY_LIMIT}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load audio history.");
        return;
      }

      const payload = (await response.json()) as AudioHistoryResponseDto;
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

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          voiceStyle,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Audio generation failed.");
        return;
      }

      const payload = (await response.json()) as AudioGenerationResponseDto;
      setUsage(payload.usage);
      setPrompt("");
      await loadHistory();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGeneration(generationId: string) {
    const shouldDelete = window.confirm("Delete this audio from history? This will also remove stored media.");
    if (!shouldDelete) {
      return;
    }

    setIsDeletingGenerationId(generationId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/audio/${generationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not delete audio.");
        return;
      }

      setHistory((current) => current.filter((item) => item.id !== generationId));
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsDeletingGenerationId(null);
    }
  }

  const sidebarSlot = (
    <>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Audio Model</h3>
        </div>
        <div className="relative">
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            <option value="replicate-audio">Replicate Chatterbox (TTS)</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M12 6v12" />
            <path d="M17 10a5 5 0 0 1-10 0" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Voice Style</h3>
        </div>
        <div className="relative">
          <select
            value={voiceStyle}
            onChange={(event) =>
              setVoiceStyle(event.target.value as (typeof VOICE_STYLE_OPTIONS)[number]["value"])
            }
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            {VOICE_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <div className="border-t border-[#24262d] pt-2">
        <button className="group flex w-full items-center justify-between">
          <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
            Generation Settings
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-500 group-hover:text-slate-300"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </>
  );

  const contentSlot = (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-8 py-8">
      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#14b8a6]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-slate-400">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mb-4 text-slate-600"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="text-sm">No audio generated yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Enter text below to generate speech.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {sortedHistory.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[#2d313a] bg-[#18191e]"
            >
              <div className="bg-[#111215] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-medium text-slate-200">{item.prompt}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteGeneration(item.id)}
                    disabled={isDeletingGenerationId === item.id}
                    className="rounded-md border border-rose-900/50 bg-rose-950/30 p-1 text-rose-300 hover:bg-rose-950/45 disabled:opacity-50"
                    aria-label={`Delete audio generation ${item.prompt}`}
                    title="Delete audio"
                  >
                    {isDeletingGenerationId === item.id ? (
                      <span className="px-1 text-[10px]">...</span>
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="border-t border-[#2d313a] p-4">
                {item.audioUrl ? (
                  <audio controls preload="metadata" src={item.audioUrl} className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                    {item.output}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const promptSlot = (
    <AiPromptComposer
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleGenerate}
      placeholder="Enter the text you want spoken..."
      isSubmitting={isSubmitting}
      submitLabel="Generate Speech"
      submittingLabel="Generating..."
      tip="Tip: Keep text clear and concise for best text-to-speech quality."
      errorMessage={errorMessage}
    />
  );

  return (
    <ModuleShell
      title="Audio Generation"
      usage={usage}
      sidebarSlot={sidebarSlot}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
