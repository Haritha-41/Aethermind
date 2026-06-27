"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { ModelPicker, type ModelOption } from "@/features/dashboard/components/model-picker";
import { ToolBadge } from "@/features/dashboard/components/tool-badge";
import { toolAccents } from "@/features/dashboard/config/dashboard-navigation";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

const MODEL_OPTIONS: readonly ModelOption[] = [
  { value: "replicate-image", name: "Replicate Image", provider: "Replicate", dot: "#E5532E", tag: "Versatile" },
  { value: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", provider: "Google", dot: "#4285F4", tag: "Photoreal" },
];

const RATIOS: { value: string; w: number; h: number }[] = [
  { value: "1:1", w: 20, h: 20 },
  { value: "16:9", w: 24, h: 14 },
  { value: "9:16", w: 14, h: 24 },
];

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
                  active ? "border-[#9FD9C5] bg-[#E7F4EF] text-[#0B8366]" : "border-[#E6E6E1] bg-white text-[#6E6E68]"
                }`}
              >
                <div
                  className="rounded-[3px] border-[1.8px]"
                  style={{ width: ratio.w, height: ratio.h, borderColor: active ? "#0E9F77" : "#C2C2BA" }}
                />
                <span className="text-[12px] font-semibold">{ratio.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style */}
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Style</div>
        <div className="relative">
          <select
            value={styleVal}
            onChange={(e) => setStyleVal(e.target.value)}
            className="w-full appearance-none rounded-[11px] border border-[#E6E6E1] bg-white px-[14px] py-[11px] text-[13.5px] font-medium text-[#1B1B18] outline-none focus:border-[#0E9F77]"
          >
            <option value="Photorealistic">Photorealistic</option>
            <option value="Anime">Anime</option>
            <option value="Digital Art">Digital Art</option>
            <option value="Cinematic">Cinematic</option>
          </select>
          <div className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Images count */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Images</span>
          <span className="text-[13px] font-semibold text-[#0E9F77]">{numImages}</span>
        </div>
        <input
          type="range"
          min="1"
          max="4"
          value={numImages}
          onChange={(e) => setNumImages(parseInt(e.target.value))}
          className="h-[6px] w-full cursor-pointer appearance-none rounded-[6px] bg-[#E6E6E1] accent-[#0E9F77]"
        />
        <div className="mt-2 flex justify-between text-[11px] text-[#B0B0A8]">
          <span>1</span>
          <span>4</span>
        </div>
      </div>

      <div className="mt-auto rounded-[12px] border border-[#E2EFE9] bg-[#F4F8F6] px-[14px] py-[13px] text-[12px] leading-[1.5] text-[#5C7C6E]">
        Tip: name lighting, lens, and mood for sharper results.
      </div>
    </div>
  );

  const contentSlot = (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-7 py-6">
      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E6E6E1] border-t-[#0E9F77]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-[#9A9A92]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-[#D6D6CF]">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm">No images generated yet.</p>
          <p className="mt-1 text-xs text-[#B0B0A8]">Use the prompt below to create something beautiful.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[14px] md:grid-cols-3 lg:grid-cols-4">
          {sortedHistory.map((item) => (
            <div key={item.id} className="lift group relative aspect-square overflow-hidden rounded-[16px] bg-[#EFEFEA] shadow-[0_1px_2px_rgba(20,20,18,0.05)]">
              <button
                type="button"
                onClick={() => void handleDeleteGeneration(item.id)}
                disabled={isDeletingGenerationId === item.id}
                className="absolute right-2 top-2 z-20 rounded-md bg-black/40 p-1 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Delete image generation ${item.prompt}`}
                title="Delete image"
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
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.prompt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9A92]">Failed</div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent to-[50%]" />
              <p className="absolute inset-x-[13px] bottom-3 line-clamp-2 text-[12px] font-medium leading-[1.3] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                {item.prompt}
              </p>
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
      placeholder="Describe the image you want to generate…"
      isSubmitting={isSubmitting}
      submitLabel="Generate"
      submittingLabel="Generating..."
      errorMessage={errorMessage}
      submitBadge={numImages}
      accent="#0E9F77"
    />
  );

  return (
    <ModuleShell
      title="Image"
      icon={<ToolBadge icon="image" fg={toolAccents.image.fg} bg={toolAccents.image.bg} />}
      headerRight={<ModelPicker options={MODEL_OPTIONS} value={model} onChange={setModel} />}
      usage={usage}
      sidebarSlot={sidebarSlot}
      sidebarWidth={280}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
