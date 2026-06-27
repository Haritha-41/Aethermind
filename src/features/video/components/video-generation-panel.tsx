"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { ModelPicker, type ModelOption } from "@/features/dashboard/components/model-picker";
import { ToolBadge } from "@/features/dashboard/components/tool-badge";
import { toolAccents } from "@/features/dashboard/config/dashboard-navigation";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

const MODEL_OPTIONS: readonly ModelOption[] = [
  { value: "replicate-video", name: "Replicate Video", provider: "Replicate", dot: "#E5532E", tag: "Versatile" },
  { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", dot: "#4285F4", tag: "Realistic" },
];

const RATIOS: { value: string; w: number; h: number }[] = [
  { value: "1:1", w: 20, h: 20 },
  { value: "16:9", w: 24, h: 14 },
  { value: "9:16", w: 14, h: 24 },
];

import type {
  AiErrorDto,
  VideoGenerationHistoryItemDto,
  VideoGenerationResponseDto,
  VideoHistoryResponseDto,
  VideoUsageDto,
} from "@/types/ai";

const DEFAULT_MODEL = "replicate-video";
const DEFAULT_HISTORY_LIMIT = 10;

async function parseAiErrorResponse(response: Response): Promise<AiErrorDto> {
  try {
    return (await response.json()) as AiErrorDto;
  } catch {
    return {
      error: `Request failed with status ${response.status}.`,
    };
  }
}

export function VideoGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [history, setHistory] = useState<VideoGenerationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<VideoUsageDto | null>(null);
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
      const response = await fetch(`/api/ai/video?limit=${DEFAULT_HISTORY_LIMIT}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load video history.");
        return;
      }

      const payload = (await response.json()) as VideoHistoryResponseDto;
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
      const response = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Video generation failed.");
        return;
      }

      const payload = (await response.json()) as VideoGenerationResponseDto;
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
    const shouldDelete = window.confirm("Delete this video from history? This will also remove stored media.");
    if (!shouldDelete) {
      return;
    }

    setIsDeletingGenerationId(generationId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/video/${generationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not delete video.");
        return;
      }

      setHistory((current) => current.filter((item) => item.id !== generationId));
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsDeletingGenerationId(null);
    }
  }

  const featured = sortedHistory[0];
  const rest = sortedHistory.slice(1);

  const sidebarSlot = (
    <div className="flex h-full min-h-0 flex-col gap-6 p-5">
      {/* Aspect Ratio */}
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Aspect ratio</div>
        <div className="grid grid-cols-3 gap-[9px]">
          {RATIOS.map((ratio) => {
            const active = aspectRatio === ratio.value;
            return (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={`flex h-16 flex-col items-center justify-center gap-[9px] rounded-[12px] border transition-colors ${
                  active ? "border-[#BCCFF0] bg-[#E7EEFB] text-[#3C63B8]" : "border-[#E6E6E1] bg-white text-[#6E6E68]"
                }`}
              >
                <div
                  className="rounded-[3px] border-[1.8px]"
                  style={{ width: ratio.w, height: ratio.h, borderColor: active ? "#5A7FD6" : "#C2C2BA" }}
                />
                <span className="text-[12px] font-semibold">{ratio.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration (presentational) */}
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Duration</div>
        <div className="flex gap-[9px]">
          <div className="flex-1 cursor-pointer rounded-[11px] border border-[#BCCFF0] bg-[#E7EEFB] py-[11px] text-center text-[13px] font-semibold text-[#3C63B8]">5s</div>
          <div className="flex-1 cursor-pointer rounded-[11px] border border-[#E6E6E1] bg-white py-[11px] text-center text-[13px] font-semibold text-[#6E6E68]">10s</div>
        </div>
      </div>

      {/* Motion (presentational) */}
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Motion</div>
        <div className="flex cursor-pointer items-center justify-between rounded-[11px] border border-[#E6E6E1] bg-white px-[14px] py-[11px]">
          <span className="text-[13.5px] font-medium">Smooth · cinematic</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="mt-auto rounded-[12px] border border-[#DCE6F6] bg-[#EEF3FB] px-[14px] py-[13px] text-[12px] leading-[1.5] text-[#4E648C]">
        Cinematic clips render in ~40s. Credits scale with duration.
      </div>
    </div>
  );

  const deleteButton = (item: VideoGenerationHistoryItemDto) => (
    <button
      type="button"
      onClick={() => void handleDeleteGeneration(item.id)}
      disabled={isDeletingGenerationId === item.id}
      className="absolute right-2 top-2 z-20 rounded-md bg-black/40 p-1 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100 disabled:opacity-50"
      aria-label={`Delete video generation ${item.prompt}`}
      title="Delete video"
    >
      {isDeletingGenerationId === item.id ? (
        <span className="px-1 text-[10px]">…</span>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )}
    </button>
  );

  const contentSlot = (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-7 py-6">
      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E6E6E1] border-t-[#5A7FD6]" />
        </div>
      ) : !featured ? (
        <div className="flex h-full flex-col items-center justify-center text-[#9A9A92]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-[#D6D6CF]">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <p className="text-sm">No videos generated yet.</p>
          <p className="mt-1 text-xs text-[#B0B0A8]">Provide instructions to start generating.</p>
        </div>
      ) : (
        <>
          {/* featured player */}
          <div className="group relative aspect-video overflow-hidden rounded-[20px] bg-[#dfe3ea] shadow-[0_14px_34px_-16px_rgba(20,20,18,0.3)]">
            {deleteButton(featured)}
            {featured.videoUrl ? (
              <video src={featured.videoUrl} controls preload="metadata" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-[#6E6E68]">
                <p className="line-clamp-3 text-xs leading-relaxed">{featured.output}</p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-[18px] bottom-4">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">Latest render</div>
              <div className="line-clamp-1 text-[16px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">{featured.prompt}</div>
            </div>
          </div>

          {rest.length > 0 ? (
            <>
              <div className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Recent clips</div>
              <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-3">
                {rest.map((item) => (
                  <div key={item.id} className="lift group relative aspect-video overflow-hidden rounded-[14px] bg-[#dfe3ea]">
                    {deleteButton(item)}
                    {item.videoUrl ? (
                      <video src={item.videoUrl} controls preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] text-[#6E6E68]">
                        <span className="line-clamp-3">{item.output}</span>
                      </div>
                    )}
                    <p className="pointer-events-none absolute inset-x-[10px] bottom-[9px] line-clamp-1 text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                      {item.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );

  const promptSlot = (
    <AiPromptComposer
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleGenerate}
      placeholder="Describe the video you want to generate…"
      isSubmitting={isSubmitting}
      submitLabel="Generate"
      submittingLabel="Generating..."
      errorMessage={errorMessage}
      accent={toolAccents.video.fg}
    />
  );

  return (
    <ModuleShell
      title="Video"
      icon={<ToolBadge icon="video" fg={toolAccents.video.fg} bg={toolAccents.video.bg} />}
      headerRight={<ModelPicker options={MODEL_OPTIONS} value={model} onChange={setModel} />}
      usage={usage}
      sidebarSlot={sidebarSlot}
      sidebarWidth={280}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
