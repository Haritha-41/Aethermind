"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

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

function formatDateTime(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestampMs));
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

  const sidebarSlot = (
    <div className="flex h-full min-h-0 flex-col gap-8">
      {/* Aspect Ratio */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Aspect Ratio</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setAspectRatio("1:1")}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border ${aspectRatio === "1:1" ? "border-[#14b8a6] bg-[#182a29]" : "border-[#2d313a] bg-transparent hover:bg-[#1f2128]"} py-4 transition-colors`}
          >
            <div className={`h-6 w-6 border-2 ${aspectRatio === "1:1" ? "border-[#14b8a6]" : "border-slate-500"} rounded-sm`} />
            <span className={`text-[10px] font-medium ${aspectRatio === "1:1" ? "text-[#14b8a6]" : "text-slate-400"}`}>1:1</span>
          </button>
          <button
            onClick={() => setAspectRatio("16:9")}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border ${aspectRatio === "16:9" ? "border-[#14b8a6] bg-[#182a29]" : "border-[#2d313a] bg-transparent hover:bg-[#1f2128]"} py-4 transition-colors`}
          >
            <div className={`h-4 w-7 border-2 ${aspectRatio === "16:9" ? "border-[#14b8a6]" : "border-slate-500"} rounded-sm`} />
            <span className={`text-[10px] font-medium ${aspectRatio === "16:9" ? "text-[#14b8a6]" : "text-slate-400"}`}>16:9</span>
          </button>
          <button
            onClick={() => setAspectRatio("9:16")}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border ${aspectRatio === "9:16" ? "border-[#14b8a6] bg-[#182a29]" : "border-[#2d313a] bg-transparent hover:bg-[#1f2128]"} py-4 transition-colors`}
          >
            <div className={`h-7 w-4 border-2 ${aspectRatio === "9:16" ? "border-[#14b8a6]" : "border-slate-500"} rounded-sm`} />
            <span className={`text-[10px] font-medium ${aspectRatio === "9:16" ? "text-[#14b8a6]" : "text-slate-400"}`}>9:16</span>
          </button>
        </div>
      </div>

      {/* Model */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Video Generator</h3>
        </div>
        <div className="relative">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="replicate-video">Replicate Video</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Advanced Settings */}
      <div className="mt-auto pt-2 border-t border-[#24262d]">
        <button className="flex items-center justify-between w-full group">
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Output Settings</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-slate-300">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>
  );

  const contentSlot = (
    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
      {isLoadingHistory ? (
        <div className="flex items-center justify-center h-full">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#14b8a6]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex items-center justify-center h-full flex-col text-slate-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-slate-600">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <p className="text-sm">No videos generated yet.</p>
          <p className="text-xs mt-1 text-slate-500">Provide instructions to start generating.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedHistory.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-[#2d313a] bg-[#18191e]">
              <div className="relative aspect-video bg-[#111215]">
                <button
                  type="button"
                  onClick={() => void handleDeleteGeneration(item.id)}
                  disabled={isDeletingGenerationId === item.id}
                  className="absolute right-2 top-2 z-20 rounded-md border border-rose-900/50 bg-rose-950/30 p-1 text-rose-300 hover:bg-rose-950/45 disabled:opacity-50"
                  aria-label={`Delete video generation ${item.prompt}`}
                  title="Delete video"
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
                {item.videoUrl ? (
                  <video
                    src={item.videoUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-5 text-center text-slate-500">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <p className="text-xs leading-relaxed text-slate-400 line-clamp-3">{item.output}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-[#2d313a] px-4 py-3">
                <p className="line-clamp-2 text-xs font-medium text-slate-200">{item.prompt}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(item.createdAt)}</p>
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
      placeholder="Describe the video treatment or script you want to generate..."
      isSubmitting={isSubmitting}
      submitLabel="Generate Video"
      submittingLabel="Generating..."
      tip="Tip: Include scenes, camera movement, pacing, and mood for better output."
      errorMessage={errorMessage}
    />
  );

  return (
    <ModuleShell
      title="Video Generation"
      usage={usage}
      sidebarSlot={sidebarSlot}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
