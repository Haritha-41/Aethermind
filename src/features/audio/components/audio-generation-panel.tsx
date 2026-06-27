"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { ModelPicker, type ModelOption } from "@/features/dashboard/components/model-picker";
import { ToolBadge } from "@/features/dashboard/components/tool-badge";
import { toolAccents } from "@/features/dashboard/config/dashboard-navigation";
import type {
  AiErrorDto,
  AudioGenerationHistoryItemDto,
  AudioGenerationResponseDto,
  AudioHistoryResponseDto,
  AudioUsageDto,
} from "@/types/ai";

const MODEL_OPTIONS: readonly ModelOption[] = [
  { value: "replicate-audio", name: "Chatterbox TTS", provider: "Replicate", dot: "#E5532E", tag: "Expressive" },
  { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", dot: "#4285F4", tag: "Fast" },
];

// Deterministic decorative waveform (mockup parity).
const WAVEFORM = Array.from({ length: 46 }, (_, i) =>
  4 + Math.round(16 * Math.abs(Math.sin(i * 0.5)) * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.17 + 1)))),
);

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type AudioLibraryRowProps = {
  item: AudioGenerationHistoryItemDto;
  date: string;
  isDeleting: boolean;
  onDelete: () => void;
};

function AudioLibraryRow({ item, date, isDeleting, onDelete }: AudioLibraryRowProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("");

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-[#ECECE8] bg-white px-[18px] py-[14px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
      {item.audioUrl ? (
        <button
          type="button"
          onClick={toggle}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#F0EBFB] text-[#8A6FD0]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
      ) : (
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#F0EBFB] text-[#8A6FD0]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l10-2v13" /></svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[#2A2A26]">{item.prompt}</div>
        <div className="mt-[7px] flex h-[22px] items-center gap-[2px]">
          {WAVEFORM.map((h, index) => (
            <div key={index} className="w-[2.5px] rounded-[2px] bg-[#D9CEF0]" style={{ height: h }} />
          ))}
        </div>
        {item.audioUrl ? (
          <audio
            ref={audioRef}
            src={item.audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => setDuration(formatClock(e.currentTarget.duration))}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        {duration ? <div className="text-[12.5px] font-semibold text-[#6E6E68]">{duration}</div> : null}
        <div className="mt-[2px] text-[11px] text-[#A6A69E]">{date}</div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="shrink-0 rounded-md p-1 text-[#C0683E] hover:bg-[#FBECEC] disabled:opacity-50"
        aria-label={`Delete audio ${item.prompt}`}
        title="Delete audio"
      >
        {isDeleting ? (
          <span className="px-1 text-[10px]">…</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        )}
      </button>
    </div>
  );
}

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

  const isDisabled = isSubmitting || !prompt.trim();

  const contentSlot = (
    <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-[760px]">
        {/* composer card */}
        <div className="rounded-[22px] border border-[#ECECE8] bg-white p-6 shadow-[0_6px_22px_-14px_rgba(20,20,18,0.18)]">
          <div className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">
            Text to speech
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Enter the text you want spoken…"
            className="min-h-[84px] w-full resize-none rounded-[14px] border border-[#EDEDE8] bg-[#FBFBF9] px-[18px] py-4 text-[15.5px] leading-[1.55] text-[#33332E] outline-none placeholder:text-[#A6A69E] focus:border-[#CDBCEE]"
          />

          {errorMessage ? (
            <div className="mt-3 rounded-xl border border-[#F0C9C4] bg-[#FBECEC] px-4 py-2.5 text-[13px] text-[#B3473D]">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-[18px] flex flex-wrap items-end justify-between gap-[14px]">
            <div>
              <div className="mb-[9px] text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Voice</div>
              <div className="flex flex-wrap gap-2">
                {VOICE_STYLE_OPTIONS.map((option) => {
                  const active = voiceStyle === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVoiceStyle(option.value)}
                      className={`rounded-[10px] border px-[14px] py-2 text-[13px] font-semibold ${
                        active
                          ? "border-[#CDBCEE] bg-[#F0EBFB] text-[#6E54B0]"
                          : "border-[#E6E6E1] bg-white text-[#6E6E68]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isDisabled}
              className="flex h-11 items-center gap-2 self-end rounded-[12px] bg-[#8A6FD0] px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(138,111,208,0.5)] transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5Z" />
                  </svg>
                  Generate speech
                </>
              )}
            </button>
          </div>
        </div>

        {/* library */}
        <div className="mb-[14px] mt-[30px] flex items-baseline justify-between">
          <h3 className="m-0 text-[16px] font-semibold">Your library</h3>
          <span className="text-[12.5px] text-[#9A9A92]">{sortedHistory.length} clips</span>
        </div>

        {isLoadingHistory ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E6E6E1] border-t-[#8A6FD0]" />
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="rounded-[16px] border border-[#ECECE8] bg-white px-5 py-8 text-center text-[13px] text-[#9A9A92]">
            No audio generated yet. Enter text above to generate speech.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedHistory.map((item) => (
              <AudioLibraryRow
                key={item.id}
                item={item}
                date={formatDateTime(item.createdAt)}
                isDeleting={isDeletingGenerationId === item.id}
                onDelete={() => void handleDeleteGeneration(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ModuleShell
      title="Audio"
      icon={<ToolBadge icon="audio" fg={toolAccents.audio.fg} bg={toolAccents.audio.bg} />}
      headerRight={<ModelPicker options={MODEL_OPTIONS} value={model} onChange={setModel} />}
      usage={usage}
      contentSlot={contentSlot}
    />
  );
}
