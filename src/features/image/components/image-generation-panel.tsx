"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

import type {
  AiErrorDto,
  ImageGenerationHistoryItemDto,
  ImageGenerationResponseDto,
  ImageHistoryResponseDto,
  ImageUsageDto,
} from "@/types/ai";

const DEFAULT_MODEL = "replicate-image";
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

export function ImageGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [styleVal, setStyleVal] = useState("Photorealistic");
  const [numImages, setNumImages] = useState(1);
  const [history, setHistory] = useState<ImageGenerationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<ImageUsageDto | null>(null);
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
      const response = await fetch(`/api/ai/image?limit=${DEFAULT_HISTORY_LIMIT}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load image history.");
        return;
      }

      const payload = (await response.json()) as ImageHistoryResponseDto;
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
      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          style: styleVal,
          numImages,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Image generation failed.");
        return;
      }

      const payload = (await response.json()) as ImageGenerationResponseDto;
      setPrompt("");
      setUsage(payload.usage);
      await loadHistory();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGeneration(generationId: string) {
    const shouldDelete = window.confirm("Delete this image from history? This will also remove stored media.");
    if (!shouldDelete) {
      return;
    }

    setIsDeletingGenerationId(generationId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/image/${generationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not delete image.");
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

      {/* Style */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Style</h3>
        </div>
        <div className="relative">
          <select 
            value={styleVal}
            onChange={(e) => setStyleVal(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            <option value="Photorealistic">Photorealistic</option>
            <option value="Anime">Anime</option>
            <option value="Digital Art">Digital Art</option>
            <option value="Cinematic">Cinematic</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Model */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Model</h3>
        </div>
        <div className="relative">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
            <option value="replicate-image">Replicate Image</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Images count */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3 className="text-xs font-semibold text-slate-100">Images</h3>
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2d313a] text-[10px] font-medium text-slate-300">
            {numImages}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500">1</span>
          <input 
            type="range" 
            min="1" 
            max="4" 
            value={numImages}
            onChange={(e) => setNumImages(parseInt(e.target.value))}
            className="flex-1 h-1 bg-[#2d313a] rounded-lg appearance-none cursor-pointer accent-[#14b8a6]"
          />
          <span className="text-[10px] text-slate-500">4</span>
        </div>
      </div>
      
      {/* Advanced Settings */}
      <div className="mt-auto pt-2 border-t border-[#24262d]">
        <button className="flex items-center justify-between w-full group">
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Advanced Settings</span>
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
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p className="text-sm">No images generated yet.</p>
          <p className="text-xs mt-1 text-slate-500">Use the prompt below to create something beautiful.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedHistory.map((item) => (
              <div key={item.id} className="relative aspect-square overflow-hidden rounded-2xl border border-[#2d313a] bg-[#18191e] group">
                <button
                  type="button"
                  onClick={() => void handleDeleteGeneration(item.id)}
                  disabled={isDeletingGenerationId === item.id}
                  className="absolute right-2 top-2 z-20 rounded-md border border-rose-900/50 bg-rose-950/30 p-1 text-rose-300 hover:bg-rose-950/45 disabled:opacity-50"
                  aria-label={`Delete image generation ${item.prompt}`}
                  title="Delete image"
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
                {item.imageUrl ? (
                  <Image 
                    src={item.imageUrl} 
                    alt={item.prompt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Failed</div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-xs text-slate-200 line-clamp-2">{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
          
          {sortedHistory.length > 0 && (
            <div className="mt-8 text-center pb-8">
              <button className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto">
                Load More 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const promptSlot = (
    <AiPromptComposer
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleGenerate}
      placeholder="Describe the image you want to generate in detail..."
      isSubmitting={isSubmitting}
      submitLabel="Generate"
      submittingLabel="Generating..."
      tip="Tip: Use specific keywords for lighting, style, and composition to get better results."
      errorMessage={errorMessage}
      submitBadge={numImages}
    />
  );

  return (
    <ModuleShell
      title="Image Generation"
      usage={usage}
      sidebarSlot={sidebarSlot}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
