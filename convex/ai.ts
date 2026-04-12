import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, action } from "./_generated/server";
import { assertServerAccessKey } from "./security";

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_CODE_MODEL = "gemini-2.5-flash";
const DEFAULT_VIDEO_MODEL = "gemini-2.5-flash";
const DEFAULT_AUDIO_MODEL = "gemini-2.5-flash";
const DEFAULT_CONVERSATION_MODEL = "gemini-2.5-flash";
const DEFAULT_REPLICATE_IMAGE_MODEL_ALIAS = "replicate-image";
const DEFAULT_REPLICATE_VIDEO_MODEL_ALIAS = "replicate-video";
const DEFAULT_REPLICATE_AUDIO_MODEL_ALIAS = "replicate-audio";
const REPLICATE_IMAGE_MODEL_FALLBACK = "google/imagen-4";
const REPLICATE_VIDEO_MODEL_FALLBACK = "minimax/video-01";
const REPLICATE_AUDIO_MODEL_FALLBACK = "resemble-ai/chatterbox";
const REPLICATE_API_BASE_URL = "https://api.replicate.com/v1";
const REPLICATE_REQUEST_TIMEOUT_MS = 30_000;
const REPLICATE_POLL_INTERVAL_MS = 1_500;
const REPLICATE_MAX_POLL_ATTEMPTS = 120;
const REPLICATE_VIDEO_POLL_INTERVAL_MS = 2_000;
const REPLICATE_VIDEO_MAX_POLL_ATTEMPTS = 240;
const CONVERSATION_CONTEXT_LIMIT = 12;
const CONVERSATION_SYSTEM_INSTRUCTION =
  "Respond with clear, readable markdown. Use headings, short sections, and bullet lists when helpful. Keep tone practical and concise.";
const MAX_MODEL_LENGTH = 80;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9.-]{0,79}$/i;
const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
const MAX_GENERATION_OUTPUT_CHARS = 16_000;
const GENERATION_KIND_VALUES = [
  "image",
  "code",
  "video",
  "audio",
  "conversation",
] as const;
const SESSION_KIND_VALUES = ["code", "conversation"] as const;
const IMAGE_STYLE_VALUES = ["Photorealistic", "Anime", "Digital Art", "Cinematic"] as const;
const IMAGE_ASPECT_RATIO_VALUES = ["1:1", "16:9", "9:16"] as const;
const AUDIO_VOICE_STYLE_VALUES = [
  "balanced",
  "calm",
  "energetic",
  "narrator",
  "dramatic",
] as const;
const MAX_SESSION_TITLE_LENGTH = 80;
const MAX_IMAGE_BATCH = 4;

type GenerationKind = (typeof GENERATION_KIND_VALUES)[number];
type SessionKind = (typeof SESSION_KIND_VALUES)[number];
type ImageStyle = (typeof IMAGE_STYLE_VALUES)[number];
type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIO_VALUES)[number];
type AudioVoiceStyle = (typeof AUDIO_VOICE_STYLE_VALUES)[number];

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

type ReplicatePredictionResponse = {
  id: string;
  status: string;
  output?: unknown;
  error?: string | null;
};

function isGenerationKind(value: string): value is GenerationKind {
  return (GENERATION_KIND_VALUES as readonly string[]).includes(value);
}

function parseGenerationKind(value: string): GenerationKind {
  const normalized = value.trim().toLowerCase();
  if (!isGenerationKind(normalized)) {
    throw new ConvexError("Unsupported generation kind.");
  }

  return normalized;
}

function isSessionKind(value: string): value is SessionKind {
  return (SESSION_KIND_VALUES as readonly string[]).includes(value);
}

function parseSessionKind(value: string): SessionKind {
  const normalized = value.trim().toLowerCase();
  if (!isSessionKind(normalized)) {
    throw new ConvexError("Unsupported session kind.");
  }

  return normalized;
}

function parseImageStyle(value: string | undefined): ImageStyle {
  const normalized = value?.trim();
  if (!normalized) {
    return "Photorealistic";
  }
  if (!(IMAGE_STYLE_VALUES as readonly string[]).includes(normalized)) {
    throw new ConvexError("Unsupported image style.");
  }
  return normalized as ImageStyle;
}

function parseImageAspectRatio(value: string | undefined): ImageAspectRatio {
  const normalized = value?.trim();
  if (!normalized) {
    return "1:1";
  }
  if (!(IMAGE_ASPECT_RATIO_VALUES as readonly string[]).includes(normalized)) {
    throw new ConvexError("Unsupported image aspect ratio.");
  }
  return normalized as ImageAspectRatio;
}

function parseVideoAspectRatio(value: string | undefined): ImageAspectRatio {
  return parseImageAspectRatio(value);
}

function parseAudioVoiceStyle(value: string | undefined): AudioVoiceStyle {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "balanced";
  }
  if (!(AUDIO_VOICE_STYLE_VALUES as readonly string[]).includes(normalized)) {
    throw new ConvexError("Unsupported audio voice style.");
  }
  return normalized as AudioVoiceStyle;
}

function sanitizeImageCount(value: number | undefined): number {
  const count = value ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_IMAGE_BATCH) {
    throw new ConvexError(`numImages must be between 1 and ${MAX_IMAGE_BATCH}.`);
  }
  return count;
}

function getDefaultModelForKind(kind: GenerationKind): string {
  switch (kind) {
    case "image":
      return DEFAULT_IMAGE_MODEL;
    case "code":
      return DEFAULT_CODE_MODEL;
    case "video":
      return DEFAULT_VIDEO_MODEL;
    case "audio":
      return DEFAULT_AUDIO_MODEL;
    case "conversation":
      return DEFAULT_CONVERSATION_MODEL;
  }
}

function createSessionTitle(rawTitle: string | undefined, promptFallback: string): string {
  const titleInput = rawTitle?.trim() || promptFallback.trim();
  if (!titleInput) {
    return "New session";
  }

  const condensed = titleInput.replace(/\s+/g, " ");
  if (condensed.length <= MAX_SESSION_TITLE_LENGTH) {
    return condensed;
  }

  return `${condensed.slice(0, MAX_SESSION_TITLE_LENGTH - 3)}...`;
}

function shouldPromotePromptToSessionTitle(title: string, kind: SessionKind): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized === "new session" || normalized === `${kind} session`;
}

function normalizeSessionTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (!title) {
    throw new ConvexError("Session title cannot be empty.");
  }

  const condensed = title.replace(/\s+/g, " ");
  if (condensed.length <= MAX_SESSION_TITLE_LENGTH) {
    return condensed;
  }

  return `${condensed.slice(0, MAX_SESSION_TITLE_LENGTH - 3)}...`;
}

function sanitizeModel(input: string | undefined, fallbackModel: string): string {
  const model = input?.trim() || fallbackModel;
  if (!model) {
    throw new ConvexError("Model is required.");
  }
  if (model.length > MAX_MODEL_LENGTH) {
    throw new ConvexError("Model must be 80 characters or less.");
  }
  if (!MODEL_PATTERN.test(model)) {
    throw new ConvexError("Model contains unsupported characters.");
  }

  return model;
}

function sanitizePrompt(prompt: string, minLength: number, maxLength: number): string {
  const normalized = prompt.trim();
  if (normalized.length < minLength) {
    throw new ConvexError("Prompt is too short.");
  }
  if (normalized.length > maxLength) {
    throw new ConvexError("Prompt exceeds the maximum allowed length.");
  }

  return normalized;
}

function sanitizeOutputForStorage(output: string): string {
  if (output.length <= MAX_GENERATION_OUTPUT_CHARS) {
    return output;
  }

  return `${output.slice(0, MAX_GENERATION_OUTPUT_CHARS)}\n\n[Output truncated for storage]`;
}

async function ensureActiveUser(
  ctx: {
    runQuery: (
      fn: typeof api.users.getUserById,
      args: { serverAccessKey: string; userId: Id<"users"> },
    ) => Promise<{ accountStatus: string } | null>;
  },
  serverAccessKey: string,
  userId: Id<"users">,
): Promise<void> {
  const user = await ctx.runQuery(api.users.getUserById, {
    serverAccessKey,
    userId,
  });
  if (!user) {
    throw new ConvexError("User does not exist.");
  }
  if (user.accountStatus !== "active") {
    throw new ConvexError("User account is not active.");
  }
}

async function callGeminiGenerateContent(params: {
  apiKey: string;
  model: string;
  body: Record<string, unknown>;
}): Promise<GeminiResponse> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.body),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new ConvexError(`Gemini request failed with status ${response.status}.`);
    }

    return (await response.json()) as GeminiResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ConvexError("Gemini request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function getReplicateApiToken(): string {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new ConvexError("REPLICATE_API_TOKEN is not configured.");
  }

  return token;
}

function resolveReplicateModelSlug(
  kind: "image" | "video" | "audio",
  requestedModel: string,
): string {
  const normalizedModel = requestedModel.trim().toLowerCase();
  if (kind === "image") {
    if (normalizedModel === "replicate-image") {
      return process.env.REPLICATE_IMAGE_MODEL?.trim() || REPLICATE_IMAGE_MODEL_FALLBACK;
    }
    return process.env.REPLICATE_IMAGE_MODEL?.trim() || REPLICATE_IMAGE_MODEL_FALLBACK;
  }

  if (kind === "video") {
    if (normalizedModel === "replicate-video") {
      return process.env.REPLICATE_VIDEO_MODEL?.trim() || REPLICATE_VIDEO_MODEL_FALLBACK;
    }
    return process.env.REPLICATE_VIDEO_MODEL?.trim() || REPLICATE_VIDEO_MODEL_FALLBACK;
  }

  const configuredAudioModel = process.env.REPLICATE_AUDIO_MODEL?.trim();
  const legacyMusicModel = process.env.REPLICATE_MUSIC_MODEL?.trim();
  if (normalizedModel === "replicate-audio") {
    return configuredAudioModel || REPLICATE_AUDIO_MODEL_FALLBACK;
  }
  return configuredAudioModel || legacyMusicModel || REPLICATE_AUDIO_MODEL_FALLBACK;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function callReplicateApi<T>(params: {
  apiToken: string;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
}): Promise<T> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REPLICATE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${REPLICATE_API_BASE_URL}${params.path}`, {
      method: params.method,
      headers: {
        Authorization: `Bearer ${params.apiToken}`,
        "Content-Type": "application/json",
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const payload = (await response.json()) as {
          error?: string;
          detail?: string;
          title?: string;
        };
        detail =
          payload.error?.trim() ||
          payload.detail?.trim() ||
          payload.title?.trim() ||
          "";
      } catch {
        detail = "";
      }

      throw new ConvexError(
        `Replicate request failed with status ${response.status}.${detail ? ` ${detail}` : ""}`.trim(),
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ConvexError("Replicate request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function runReplicatePrediction(params: {
  apiToken: string;
  modelSlug: string;
  input: Record<string, unknown>;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}): Promise<ReplicatePredictionResponse> {
  const slugParts = params.modelSlug.split("/");
  if (slugParts.length !== 2 || !slugParts[0] || !slugParts[1]) {
    throw new ConvexError("Replicate model slug must be in 'owner/model' format.");
  }
  const owner = slugParts[0];
  const modelName = slugParts[1];

  let prediction = await callReplicateApi<ReplicatePredictionResponse>({
    apiToken: params.apiToken,
    method: "POST",
    path: `/models/${owner}/${modelName}/predictions`,
    body: {
      input: params.input,
    },
  });

  const pollIntervalMs = params.pollIntervalMs ?? REPLICATE_POLL_INTERVAL_MS;
  const maxPollAttempts = params.maxPollAttempts ?? REPLICATE_MAX_POLL_ATTEMPTS;

  let attempts = 0;
  while (
    (prediction.status === "starting" || prediction.status === "processing") &&
    attempts < maxPollAttempts
  ) {
    attempts += 1;
    await delay(pollIntervalMs);
    prediction = await callReplicateApi<ReplicatePredictionResponse>({
      apiToken: params.apiToken,
      method: "GET",
      path: `/predictions/${prediction.id}`,
    });
  }

  if (prediction.status !== "succeeded") {
    if (prediction.error) {
      throw new ConvexError(`Replicate prediction failed: ${prediction.error}`);
    }

    if (prediction.status === "starting" || prediction.status === "processing") {
      throw new ConvexError("Replicate request timed out.");
    }

    throw new ConvexError(`Replicate prediction ended with status ${prediction.status}.`);
  }

  return prediction;
}

function collectReplicateOutputUrls(value: unknown, urls: string[]): void {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    urls.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReplicateOutputUrls(item, urls);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const directUrl = record.url;
  if (typeof directUrl === "string" && /^https?:\/\//i.test(directUrl)) {
    urls.push(directUrl);
  }

  for (const nestedValue of Object.values(record)) {
    collectReplicateOutputUrls(nestedValue, urls);
  }
}

function extractReplicateOutputUrls(output: unknown): string[] {
  const urls: string[] = [];
  collectReplicateOutputUrls(output, urls);
  return [...new Set(urls)];
}

async function storeMediaFromUrl(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  url: string,
): Promise<Id<"_storage">> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ConvexError(`Replicate media fetch failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  if (blob.size <= 0) {
    throw new ConvexError("Replicate returned an empty media file.");
  }

  return ctx.storage.store(blob);
}

function buildCodePrompt(prompt: string): string {
  return [
    "You are a senior software engineer.",
    "Return implementation-ready code and concise explanation.",
    "Prefer safe, production-ready patterns and include clear structure.",
    "Respond using markdown with these sections in order:",
    "1) Brief Explanation",
    "2) Code",
    "3) Example Output (only when relevant)",
    "Always wrap code in fenced code blocks with a language tag (for example, ```python).",
    "Keep explanations short and practical.",
    "User request:",
    prompt,
  ].join("\n\n");
}

function buildVideoPrompt(prompt: string, aspectRatio: ImageAspectRatio): string {
  return [
    "You are a video generation planner.",
    "Create a detailed, production-ready video treatment from the prompt.",
    `Target aspect ratio: ${aspectRatio}.`,
    "Include shot list, camera notes, motion cues, lighting, timing, and style direction.",
    "Keep output concise and directly actionable for video generation tools.",
    "User request:",
    prompt,
  ].join("\n\n");
}

function describeAudioVoiceStyle(style: AudioVoiceStyle): string {
  switch (style) {
    case "calm":
      return "calm and soft";
    case "energetic":
      return "energetic and upbeat";
    case "narrator":
      return "clear narrator voice";
    case "dramatic":
      return "dramatic and expressive";
    default:
      return "balanced and natural";
  }
}

function getReplicateVoiceTuning(style: AudioVoiceStyle): {
  temperature: number;
  exaggeration: number;
  cfgWeight: number;
} {
  switch (style) {
    case "calm":
      return { temperature: 0.55, exaggeration: 0.35, cfgWeight: 0.55 };
    case "energetic":
      return { temperature: 0.9, exaggeration: 0.8, cfgWeight: 0.45 };
    case "narrator":
      return { temperature: 0.5, exaggeration: 0.25, cfgWeight: 0.7 };
    case "dramatic":
      return { temperature: 0.75, exaggeration: 0.9, cfgWeight: 0.6 };
    default:
      return { temperature: 0.8, exaggeration: 0.5, cfgWeight: 0.5 };
  }
}

function buildAudioPrompt(prompt: string, voiceStyle: AudioVoiceStyle): string {
  return [
    "You are an audio generation planner.",
    "Create a detailed, production-ready audio generation prompt.",
    `Preferred voice style: ${describeAudioVoiceStyle(voiceStyle)}.`,
    "Include genre, tempo (BPM), instruments, mood, structure (intro, chorus, verse), and mixing notes.",
    "Keep output concise and directly actionable for audio generation models.",
    "User request:",
    prompt,
  ].join("\n\n");
}

function buildReplicateAudioInput(
  modelSlug: string,
  prompt: string,
  voiceStyle: AudioVoiceStyle,
): Record<string, unknown> {
  const normalizedSlug = modelSlug.toLowerCase();
  const tuning = getReplicateVoiceTuning(voiceStyle);
  if (normalizedSlug.includes("chatterbox-multilingual")) {
    return {
      text: prompt.slice(0, 300),
      language: "en",
      temperature: tuning.temperature,
      exaggeration: tuning.exaggeration,
      cfg_weight: tuning.cfgWeight,
    };
  }

  return {
    prompt,
    temperature: tuning.temperature,
    exaggeration: tuning.exaggeration,
    cfg_weight: tuning.cfgWeight,
  };
}

function buildImagePrompt(prompt: string, style: ImageStyle, aspectRatio: ImageAspectRatio): string {
  return [
    "You are an image generation assistant.",
    `Style: ${style}.`,
    `Aspect ratio target: ${aspectRatio}.`,
    "Generate a visually strong single image that follows the user request.",
    "Do not include text overlays, watermarks, logos, or signatures unless explicitly asked.",
    "User request:",
    prompt,
  ].join("\n\n");
}

function buildConversationContents(
  history: Array<{
    prompt: string;
    output: string;
  }>,
  latestPrompt: string,
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  const orderedHistory = [...history].reverse();
  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const item of orderedHistory) {
    contents.push({
      role: "user",
      parts: [{ text: item.prompt }],
    });
    contents.push({
      role: "model",
      parts: [{ text: item.output }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: latestPrompt }],
  });

  return contents;
}

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 25, 1), 100);
}

function extractGeminiText(payload: GeminiResponse): string | null {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return text.length > 0 ? text : null;
}

function extractGeminiImage(payload: GeminiResponse): {
  mimeType: string;
  base64Data: string;
  description: string | null;
} | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (part) =>
      typeof part.inlineData?.mimeType === "string" &&
      part.inlineData.mimeType.startsWith("image/") &&
      typeof part.inlineData.data === "string" &&
      part.inlineData.data.length > 0,
  );

  if (!imagePart?.inlineData?.mimeType || !imagePart.inlineData.data) {
    return null;
  }

  const description = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return {
    mimeType: imagePart.inlineData.mimeType,
    base64Data: imagePart.inlineData.data,
    description: description.length > 0 ? description : null,
  };
}

function base64ToArrayBuffer(base64Value: string): ArrayBuffer {
  const binaryString = atob(base64Value);
  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes.buffer;
}

export const listGenerationsByUserAndKind = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseGenerationKind(args.kind);
    const limit = clampLimit(args.limit);
    return ctx.db
      .query("generations")
      .withIndex("by_user_kind_created_at", (q) =>
        q.eq("userId", args.userId).eq("kind", kind),
      )
      .order("desc")
      .take(limit);
  },
});

export const getSessionById = query({
  args: {
    serverAccessKey: v.string(),
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    return ctx.db.get(args.sessionId);
  },
});

export const listSessionsByUserAndKind = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseSessionKind(args.kind);
    const limit = clampLimit(args.limit);

    const sessions = await ctx.db
      .query("aiSessions")
      .withIndex("by_user_kind_last_activity_at", (q) =>
        q.eq("userId", args.userId).eq("kind", kind),
      )
      .order("desc")
      .take(limit);

    const hydratedSessions = await Promise.all(
      sessions.map(async (session) => {
        if (!shouldPromotePromptToSessionTitle(session.title, kind)) {
          return session;
        }

        const firstGeneration = await ctx.db
          .query("generations")
          .withIndex("by_session_created_at", (q) => q.eq("sessionId", session._id))
          .order("asc")
          .take(1);

        if (firstGeneration.length === 0) {
          return {
            ...session,
            title: "New session",
          };
        }

        return {
          ...session,
          title: createSessionTitle(undefined, firstGeneration[0].prompt),
        };
      }),
    );

    return hydratedSessions;
  },
});

export const createSession = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseSessionKind(args.kind);
    const now = Date.now();

    return ctx.db.insert("aiSessions", {
      userId: args.userId,
      kind,
      title: createSessionTitle(args.title, "New session"),
      createdAt: now,
      lastActivityAt: now,
      updatedAt: now,
    });
  },
});

export const updateSessionTitle = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    sessionId: v.id("aiSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseSessionKind(args.kind);
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session does not exist.");
    }
    if (session.userId !== args.userId || session.kind !== kind) {
      throw new ConvexError("Session does not belong to this user.");
    }

    const updatedAt = Date.now();
    await ctx.db.patch(args.sessionId, {
      title: normalizeSessionTitle(args.title),
      updatedAt,
    });

    const updatedSession = await ctx.db.get(args.sessionId);
    if (!updatedSession) {
      throw new ConvexError("Session does not exist.");
    }

    return updatedSession;
  },
});

export const deleteSession = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseSessionKind(args.kind);
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session does not exist.");
    }
    if (session.userId !== args.userId || session.kind !== kind) {
      throw new ConvexError("Session does not belong to this user.");
    }

    let deletedGenerations = 0;
    while (true) {
      const rows = await ctx.db
        .query("generations")
        .withIndex("by_user_kind_session_created_at", (q) =>
          q.eq("userId", args.userId).eq("kind", kind).eq("sessionId", args.sessionId),
        )
        .take(50);

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        await ctx.db.delete(row._id);
        deletedGenerations += 1;
      }

      if (rows.length < 50) {
        break;
      }
    }

    await ctx.db.delete(args.sessionId);
    return { deletedGenerations };
  },
});

export const deleteGeneration = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    generationId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseGenerationKind(args.kind);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new ConvexError("Generation does not exist.");
    }
    if (generation.userId !== args.userId) {
      throw new ConvexError("Generation does not belong to this user.");
    }

    const matchesKind =
      kind === "audio"
        ? generation.kind === "audio" || generation.kind === "music"
        : generation.kind === kind;
    if (!matchesKind) {
      throw new ConvexError("Generation type mismatch.");
    }

    if (generation.imageStorageId) {
      await ctx.storage.delete(generation.imageStorageId);
    }
    await ctx.db.delete(args.generationId);
    return { success: true };
  },
});

export const listGenerationsBySession = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    sessionId: v.id("aiSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseSessionKind(args.kind);
    const limit = clampLimit(args.limit);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session does not exist.");
    }
    if (session.userId !== args.userId || session.kind !== kind) {
      throw new ConvexError("Session does not belong to this user.");
    }

    return ctx.db
      .query("generations")
      .withIndex("by_user_kind_session_created_at", (q) =>
        q.eq("userId", args.userId).eq("kind", kind).eq("sessionId", args.sessionId),
      )
      .order("desc")
      .take(limit);
  },
});

export const listImageGenerationsByUser = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const limit = clampLimit(args.limit);
    const rows = await ctx.db
      .query("generations")
      .withIndex("by_user_kind_created_at", (q) =>
        q.eq("userId", args.userId).eq("kind", "image"),
      )
      .order("desc")
      .take(limit);

    return Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        prompt: row.prompt,
        output: row.output,
        model: row.model,
        tokensUsed: row.tokensUsed ?? null,
        createdAt: row.createdAt,
        imageUrl: row.imageStorageId ? await ctx.storage.getUrl(row.imageStorageId) : null,
      })),
    );
  },
});

export const listAudioGenerationsByUser = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const limit = clampLimit(args.limit);
    const scanLimit = Math.min(limit * 8, 300);

    const rows = await ctx.db
      .query("generations")
      .withIndex("by_user_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(scanLimit);

    const audioRows = rows
      .filter((row) => row.kind === "audio" || row.kind === "music")
      .slice(0, limit);

    return Promise.all(
      audioRows.map(async (row) => ({
        id: row._id,
        prompt: row.prompt,
        output: row.output,
        model: row.model,
        tokensUsed: row.tokensUsed ?? null,
        createdAt: row.createdAt,
        audioUrl: row.imageStorageId ? await ctx.storage.getUrl(row.imageStorageId) : null,
      })),
    );
  },
});

export const listVideoGenerationsByUser = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const limit = clampLimit(args.limit);
    const rows = await ctx.db
      .query("generations")
      .withIndex("by_user_kind_created_at", (q) =>
        q.eq("userId", args.userId).eq("kind", "video"),
      )
      .order("desc")
      .take(limit);

    return Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        prompt: row.prompt,
        output: row.output,
        model: row.model,
        tokensUsed: row.tokensUsed ?? null,
        createdAt: row.createdAt,
        videoUrl: row.imageStorageId ? await ctx.storage.getUrl(row.imageStorageId) : null,
      })),
    );
  },
});

export const getImageStorageUrl = query({
  args: {
    serverAccessKey: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    return ctx.storage.getUrl(args.storageId);
  },
});

export const recordGeneration = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    kind: v.string(),
    sessionId: v.optional(v.id("aiSessions")),
    prompt: v.string(),
    output: v.string(),
    model: v.string(),
    tokensUsed: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const kind = parseGenerationKind(args.kind);
    const prompt = sanitizePrompt(args.prompt, 1, 4000);
    const model = sanitizeModel(args.model, getDefaultModelForKind(kind));
    const output = sanitizeOutputForStorage(args.output.trim());
    if (!output) {
      throw new ConvexError("Output cannot be empty.");
    }
    if (args.tokensUsed !== undefined && args.tokensUsed <= 0) {
      throw new ConvexError("tokensUsed must be greater than 0 when provided.");
    }
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session) {
        throw new ConvexError("Session does not exist.");
      }
      if (session.userId !== args.userId || session.kind !== kind) {
        throw new ConvexError("Session does not belong to this user.");
      }

      await ctx.db.patch(args.sessionId, {
        lastActivityAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return ctx.db.insert("generations", {
      userId: args.userId,
      kind,
      sessionId: args.sessionId,
      prompt,
      output,
      model,
      tokensUsed: args.tokensUsed,
      imageStorageId: args.imageStorageId,
      createdAt: Date.now(),
    });
  },
});

export const generateImageWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    style: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    numImages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_IMAGE_MODEL);
    const style = parseImageStyle(args.style);
    const aspectRatio = parseImageAspectRatio(args.aspectRatio);
    const numImages = sanitizeImageCount(args.numImages);
    const promptBase = buildImagePrompt(prompt, style, aspectRatio);

    let totalTokensUsed = 0;
    const generatedItems: Array<{
      imageStorageId: Id<"_storage">;
      output: string;
      tokensUsed: number;
    }> = [];

    for (let index = 0; index < numImages; index += 1) {
      const variationPrompt =
        numImages > 1
          ? `${promptBase}\n\nVariation ${index + 1} of ${numImages}: use a different composition and camera framing while preserving the main subject and intent.`
          : promptBase;
      const payload = await callGeminiGenerateContent({
        apiKey,
        model,
        body: {
          contents: [
            {
              role: "user",
              parts: [{ text: variationPrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        },
      });
      const image = extractGeminiImage(payload);
      if (!image) {
        throw new ConvexError("Gemini returned no image data.");
      }

      const imageBytes = base64ToArrayBuffer(image.base64Data);
      const imageBlob = new Blob([imageBytes], { type: image.mimeType });
      const imageStorageId = await ctx.storage.store(imageBlob);

      const output = sanitizeOutputForStorage(
        image.description ?? `${style} image generated successfully at ${aspectRatio}.`,
      );
      const tokensUsed = Math.max(Math.ceil((variationPrompt.length + output.length) / 4), 1);
      totalTokensUsed += tokensUsed;
      generatedItems.push({
        imageStorageId,
        output,
        tokensUsed,
      });
    }

    const firstGeneratedItem = generatedItems[0];
    if (!firstGeneratedItem) {
      throw new ConvexError("Image generation failed unexpectedly.");
    }

    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: generatedItems.length,
      metadata: { model, kind: "image", style, aspectRatio, numImages: generatedItems.length },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: totalTokensUsed,
      metadata: { model, kind: "image", style, aspectRatio, numImages: generatedItems.length },
    });

    for (const item of generatedItems) {
      await ctx.runMutation(api.ai.recordGeneration, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "image",
        prompt,
        output: item.output,
        model,
        tokensUsed: item.tokensUsed,
        imageStorageId: item.imageStorageId,
      });
    }

    return {
      model,
      output: firstGeneratedItem.output,
      tokensUsed: totalTokensUsed,
      imageStorageId: firstGeneratedItem.imageStorageId,
      generatedCount: generatedItems.length,
    };
  },
});

export const generateImageWithReplicate = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    style: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    numImages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiToken = getReplicateApiToken();
    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_REPLICATE_IMAGE_MODEL_ALIAS);
    const modelSlug = resolveReplicateModelSlug("image", model);
    const style = parseImageStyle(args.style);
    const aspectRatio = parseImageAspectRatio(args.aspectRatio);
    const numImages = sanitizeImageCount(args.numImages);
    const promptBase = buildImagePrompt(prompt, style, aspectRatio);

    let totalTokensUsed = 0;
    const generatedItems: Array<{
      imageStorageId: Id<"_storage">;
      output: string;
      tokensUsed: number;
    }> = [];

    for (let index = 0; index < numImages; index += 1) {
      const variationPrompt =
        numImages > 1
          ? `${promptBase}\n\nVariation ${index + 1} of ${numImages}: use a different composition and camera framing while preserving the main subject and intent.`
          : promptBase;
      const prediction = await runReplicatePrediction({
        apiToken,
        modelSlug,
        input: {
          prompt: variationPrompt,
        },
      });
      const outputUrls = extractReplicateOutputUrls(prediction.output);
      const firstOutputUrl = outputUrls[0];
      if (!firstOutputUrl) {
        throw new ConvexError("Replicate returned no output media URL.");
      }

      const imageStorageId = await storeMediaFromUrl(ctx, firstOutputUrl);
      const output = sanitizeOutputForStorage(
        [
          `${style} image generated successfully at ${aspectRatio}.`,
          `Provider model: ${modelSlug}`,
          `Source URL: ${firstOutputUrl}`,
        ].join("\n"),
      );
      const tokensUsed = Math.max(Math.ceil((variationPrompt.length + output.length) / 4), 1);
      totalTokensUsed += tokensUsed;
      generatedItems.push({
        imageStorageId,
        output,
        tokensUsed,
      });
    }

    const firstGeneratedItem = generatedItems[0];
    if (!firstGeneratedItem) {
      throw new ConvexError("Image generation failed unexpectedly.");
    }

    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: generatedItems.length,
      metadata: { model, kind: "image", provider: "replicate", style, aspectRatio, numImages: generatedItems.length },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: totalTokensUsed,
      metadata: { model, kind: "image", provider: "replicate", style, aspectRatio, numImages: generatedItems.length },
    });

    for (const item of generatedItems) {
      await ctx.runMutation(api.ai.recordGeneration, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "image",
        prompt,
        output: item.output,
        model,
        tokensUsed: item.tokensUsed,
        imageStorageId: item.imageStorageId,
      });
    }

    return {
      model,
      output: firstGeneratedItem.output,
      tokensUsed: totalTokensUsed,
      imageStorageId: firstGeneratedItem.imageStorageId,
      generatedCount: generatedItems.length,
    };
  },
});

export const generateCodeWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    sessionId: v.optional(v.id("aiSessions")),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 4000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);

    let sessionId: Id<"aiSessions">;
    let shouldPromoteTitleForExistingSession = false;
    if (args.sessionId) {
      const existingSession: {
        userId: Id<"users">;
        kind: string;
        title: string;
      } | null = await ctx.runQuery(api.ai.getSessionById, {
        serverAccessKey: args.serverAccessKey,
        sessionId: args.sessionId,
      });
      if (!existingSession) {
        throw new ConvexError("Session does not exist.");
      }
      if (existingSession.userId !== args.userId || existingSession.kind !== "code") {
        throw new ConvexError("Session does not belong to this user.");
      }
      sessionId = args.sessionId;
      shouldPromoteTitleForExistingSession = shouldPromotePromptToSessionTitle(
        existingSession.title,
        "code",
      );
    } else {
      const createdSessionId: Id<"aiSessions"> = await ctx.runMutation(api.ai.createSession, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "code",
        title: prompt,
      });
      sessionId = createdSessionId;
    }

    if (shouldPromoteTitleForExistingSession) {
      const existingGenerationRows = (await ctx.runQuery(api.ai.listGenerationsBySession, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "code",
        sessionId,
        limit: 1,
      })) as Array<{ _id: string }>;

      if (existingGenerationRows.length === 0) {
        await ctx.runMutation(api.ai.updateSessionTitle, {
          serverAccessKey: args.serverAccessKey,
          userId: args.userId,
          kind: "code",
          sessionId,
          title: prompt,
        });
      }
    }

    const model = sanitizeModel(args.model, DEFAULT_CODE_MODEL);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: buildCodePrompt(prompt) }],
          },
        ],
      },
    });
    const outputText = extractGeminiText(payload);
    if (!outputText) {
      throw new ConvexError("Gemini returned an empty response.");
    }
    const output = sanitizeOutputForStorage(outputText);

    const tokensUsed = Math.max(Math.ceil(output.length / 4), 1);
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "code" },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "code" },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "code",
      sessionId,
      prompt,
      output,
      model,
      tokensUsed,
    });

    return {
      sessionId,
      model,
      output,
      tokensUsed,
    };
  },
});

export const generateVideoWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_VIDEO_MODEL);
    const aspectRatio = parseVideoAspectRatio(args.aspectRatio);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: buildVideoPrompt(prompt, aspectRatio) }],
          },
        ],
      },
    });
    const outputText = extractGeminiText(payload);
    if (!outputText) {
      throw new ConvexError("Gemini returned an empty response.");
    }
    const output = sanitizeOutputForStorage(outputText);

    const tokensUsed = Math.max(Math.ceil(output.length / 4), 1);
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "video", aspectRatio },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "video", aspectRatio },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "video",
      prompt,
      output,
      model,
      tokensUsed,
    });

    return {
      model,
      output,
      tokensUsed,
    };
  },
});

export const generateVideoWithReplicate = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiToken = getReplicateApiToken();
    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_REPLICATE_VIDEO_MODEL_ALIAS);
    const modelSlug = resolveReplicateModelSlug("video", model);
    const aspectRatio = parseVideoAspectRatio(args.aspectRatio);
    const replicatePrompt = buildVideoPrompt(prompt, aspectRatio);
    const prediction = await runReplicatePrediction({
      apiToken,
      modelSlug,
      input: {
        prompt: replicatePrompt,
        aspect_ratio: aspectRatio,
      },
      pollIntervalMs: REPLICATE_VIDEO_POLL_INTERVAL_MS,
      maxPollAttempts: REPLICATE_VIDEO_MAX_POLL_ATTEMPTS,
    });
    const outputUrls = extractReplicateOutputUrls(prediction.output);
    const firstOutputUrl = outputUrls[0];
    if (!firstOutputUrl) {
      throw new ConvexError("Replicate returned no output media URL.");
    }

    const mediaStorageId = await storeMediaFromUrl(ctx, firstOutputUrl);
    const output = sanitizeOutputForStorage(
      [
        "Video generated successfully.",
        `Provider model: ${modelSlug}`,
        `Aspect ratio: ${aspectRatio}`,
        `Source URL: ${firstOutputUrl}`,
      ].join("\n"),
    );

    const tokensUsed = Math.max(Math.ceil((replicatePrompt.length + output.length) / 4), 1);
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "video", provider: "replicate", aspectRatio },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "video", provider: "replicate", aspectRatio },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "video",
      prompt,
      output,
      model,
      tokensUsed,
      imageStorageId: mediaStorageId,
    });

    return {
      model,
      output,
      tokensUsed,
      imageStorageId: mediaStorageId,
    };
  },
});

export const generateConversationReplyWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    sessionId: v.optional(v.id("aiSessions")),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 1, 4000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);

    let sessionId: Id<"aiSessions">;
    let shouldPromoteTitleForExistingSession = false;
    if (args.sessionId) {
      const existingSession: {
        userId: Id<"users">;
        kind: string;
        title: string;
      } | null = await ctx.runQuery(api.ai.getSessionById, {
        serverAccessKey: args.serverAccessKey,
        sessionId: args.sessionId,
      });
      if (!existingSession) {
        throw new ConvexError("Session does not exist.");
      }
      if (existingSession.userId !== args.userId || existingSession.kind !== "conversation") {
        throw new ConvexError("Session does not belong to this user.");
      }
      sessionId = args.sessionId;
      shouldPromoteTitleForExistingSession = shouldPromotePromptToSessionTitle(
        existingSession.title,
        "conversation",
      );
    } else {
      const createdSessionId: Id<"aiSessions"> = await ctx.runMutation(api.ai.createSession, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "conversation",
        title: prompt,
      });
      sessionId = createdSessionId;
    }

    const recentHistory = (await ctx.runQuery(api.ai.listGenerationsBySession, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "conversation",
      sessionId,
      limit: CONVERSATION_CONTEXT_LIMIT,
    })) as Array<{
      prompt: string;
      output: string;
    }>;

    if (shouldPromoteTitleForExistingSession && recentHistory.length === 0) {
      await ctx.runMutation(api.ai.updateSessionTitle, {
        serverAccessKey: args.serverAccessKey,
        userId: args.userId,
        kind: "conversation",
        sessionId,
        title: prompt,
      });
    }

    const model = sanitizeModel(args.model, DEFAULT_CONVERSATION_MODEL);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        systemInstruction: {
          parts: [{ text: CONVERSATION_SYSTEM_INSTRUCTION }],
        },
        contents: buildConversationContents(recentHistory, prompt),
      },
    });
    const outputText = extractGeminiText(payload);
    if (!outputText) {
      throw new ConvexError("Gemini returned an empty response.");
    }
    const output = sanitizeOutputForStorage(outputText);

    const tokensUsed = Math.max(Math.ceil((prompt.length + output.length) / 4), 1);
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "conversation" },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "conversation" },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "conversation",
      sessionId,
      prompt,
      output,
      model,
      tokensUsed,
    });

    return {
      sessionId,
      model,
      output,
      tokensUsed,
    };
  },
});

export const generateAudioWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    voiceStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_AUDIO_MODEL);
    const voiceStyle = parseAudioVoiceStyle(args.voiceStyle);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: buildAudioPrompt(prompt, voiceStyle) }],
          },
        ],
      },
    });
    const outputText = extractGeminiText(payload);
    if (!outputText) {
      throw new ConvexError("Gemini returned an empty response.");
    }
    const output = sanitizeOutputForStorage(outputText);

    const tokensUsed = Math.max(Math.ceil(output.length / 4), 1);
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "audio", voiceStyle },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "audio", voiceStyle },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "audio",
      prompt,
      output,
      model,
      tokensUsed,
    });

    return {
      model,
      output,
      tokensUsed,
    };
  },
});

export const generateAudioWithReplicate = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
    voiceStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiToken = getReplicateApiToken();
    const prompt = sanitizePrompt(args.prompt, 5, 2000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_REPLICATE_AUDIO_MODEL_ALIAS);
    const voiceStyle = parseAudioVoiceStyle(args.voiceStyle);
    const modelSlug = resolveReplicateModelSlug("audio", model);
    const replicateInput = buildReplicateAudioInput(modelSlug, prompt, voiceStyle);
    const prediction = await runReplicatePrediction({
      apiToken,
      modelSlug,
      input: replicateInput,
    });
    const outputUrls = extractReplicateOutputUrls(prediction.output);
    const firstOutputUrl = outputUrls[0];
    if (!firstOutputUrl) {
      throw new ConvexError("Replicate returned no output media URL.");
    }

    const mediaStorageId = await storeMediaFromUrl(ctx, firstOutputUrl);
    const output = sanitizeOutputForStorage(
      [
        "Audio generated successfully.",
        `Provider model: ${modelSlug}`,
        `Voice style: ${voiceStyle}`,
        `Source URL: ${firstOutputUrl}`,
      ].join("\n"),
    );
    const tokensUsed = Math.max(Math.ceil((prompt.length + output.length) / 4), 1);

    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "audio", provider: "replicate", voiceStyle },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "audio", provider: "replicate", voiceStyle },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "audio",
      prompt,
      output,
      model,
      tokensUsed,
      imageStorageId: mediaStorageId,
    });

    return {
      model,
      output,
      tokensUsed,
      imageStorageId: mediaStorageId,
    };
  },
});
