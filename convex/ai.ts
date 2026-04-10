import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, action } from "./_generated/server";
import { assertServerAccessKey } from "./security";

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_CODE_MODEL = "gemini-2.5-flash";
const DEFAULT_VIDEO_MODEL = "gemini-2.5-flash";
const DEFAULT_CONVERSATION_MODEL = "gemini-2.5-flash";
const CONVERSATION_CONTEXT_LIMIT = 12;
const MAX_MODEL_LENGTH = 80;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9.-]{0,79}$/i;
const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
const MAX_GENERATION_OUTPUT_CHARS = 16_000;
const GENERATION_KIND_VALUES = [
  "text",
  "image",
  "code",
  "video",
  "conversation",
] as const;

type GenerationKind = (typeof GENERATION_KIND_VALUES)[number];

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

function buildCodePrompt(prompt: string): string {
  return [
    "You are a senior software engineer.",
    "Return implementation-ready code and concise explanation.",
    "Prefer safe, production-ready patterns and include clear structure.",
    "User request:",
    prompt,
  ].join("\n\n");
}

function buildVideoPrompt(prompt: string): string {
  return [
    "You are a video generation planner.",
    "Create a detailed, production-ready video treatment from the prompt.",
    "Include shot list, camera notes, motion cues, lighting, timing, and style direction.",
    "Keep output concise and directly actionable for video generation tools.",
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

export const listGenerationsByUser = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const limit = clampLimit(args.limit);
    return ctx.db
      .query("generations")
      .withIndex("by_user_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

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
    const model = sanitizeModel(args.model, DEFAULT_TEXT_MODEL);
    const output = sanitizeOutputForStorage(args.output.trim());
    if (!output) {
      throw new ConvexError("Output cannot be empty.");
    }
    if (args.tokensUsed !== undefined && args.tokensUsed <= 0) {
      throw new ConvexError("tokensUsed must be greater than 0 when provided.");
    }

    return ctx.db.insert("generations", {
      userId: args.userId,
      kind,
      prompt,
      output,
      model,
      tokensUsed: args.tokensUsed,
      imageStorageId: args.imageStorageId,
      createdAt: Date.now(),
    });
  },
});

export const generateTextWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 4000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
    const model = sanitizeModel(args.model, DEFAULT_TEXT_MODEL);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
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
      metadata: { model, kind: "text" },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "text" },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "text",
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

export const generateImageWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
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
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
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
      image.description ?? "Image generated successfully.",
    );
    const tokensUsed = Math.max(Math.ceil((prompt.length + output.length) / 4), 1);

    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "generation",
      units: 1,
      metadata: { model, kind: "image" },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "image" },
    });

    await ctx.runMutation(api.ai.recordGeneration, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "image",
      prompt,
      output,
      model,
      tokensUsed,
      imageStorageId,
    });

    return {
      model,
      output,
      tokensUsed,
      imageStorageId,
    };
  },
});

export const generateCodeWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 5, 4000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);
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

export const generateVideoWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
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
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: buildVideoPrompt(prompt) }],
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
      metadata: { model, kind: "video" },
    });
    await ctx.runMutation(api.billing.trackUsageAndEnforcePlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      metric: "tokens",
      units: tokensUsed,
      metadata: { model, kind: "video" },
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

export const generateConversationReplyWithGemini = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError("GEMINI_API_KEY is not configured.");
    }

    const prompt = sanitizePrompt(args.prompt, 1, 4000);
    await ensureActiveUser(ctx, args.serverAccessKey, args.userId);

    const recentHistory = (await ctx.runQuery(api.ai.listGenerationsByUserAndKind, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      kind: "conversation",
      limit: CONVERSATION_CONTEXT_LIMIT,
    })) as Array<{
      prompt: string;
      output: string;
    }>;

    const model = sanitizeModel(args.model, DEFAULT_CONVERSATION_MODEL);
    const payload = await callGeminiGenerateContent({
      apiKey,
      model,
      body: {
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
