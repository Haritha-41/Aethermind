import { z } from "zod";

const modelNameSchema = z
  .string()
  .trim()
  .max(80, "Model name must be 80 characters or less.")
  .regex(/^[a-z0-9][a-z0-9.-]{0,79}$/i, "Model contains unsupported characters.");

const sessionIdSchema = z.string().trim().min(1).max(128);
const sessionTitleSchema = z.string().trim().min(1).max(80);
const audioVoiceStyleSchema = z.enum([
  "balanced",
  "calm",
  "energetic",
  "narrator",
  "dramatic",
]);

export const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(2000, "Prompt must be 2000 characters or less."),
  model: modelNameSchema.optional(),
  style: z.enum(["Photorealistic", "Anime", "Digital Art", "Cinematic"]).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]).optional(),
  numImages: z.coerce.number().int().min(1).max(4).optional(),
});

export const imageHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const codeGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(4000, "Prompt must be 4000 characters or less."),
  model: modelNameSchema.optional(),
  sessionId: sessionIdSchema.optional(),
});

export const codeHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
  sessionId: sessionIdSchema.optional(),
});

export const videoGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(2000, "Prompt must be 2000 characters or less."),
  model: modelNameSchema.optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]).optional(),
});

export const videoHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const conversationGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(4000, "Message must be 4000 characters or less."),
  model: modelNameSchema.optional(),
  sessionId: sessionIdSchema.optional(),
});

export const conversationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sessionId: sessionIdSchema.optional(),
});

export const sessionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createSessionSchema = z.object({
  title: sessionTitleSchema.optional(),
});

export const sessionParamsSchema = z.object({
  sessionId: sessionIdSchema,
});

export const generationParamsSchema = z.object({
  generationId: z.string().trim().min(1).max(128),
});

export const updateSessionSchema = z.object({
  title: sessionTitleSchema,
});

export const audioGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(2000, "Prompt must be 2000 characters or less."),
  model: modelNameSchema.optional(),
  voiceStyle: audioVoiceStyleSchema.optional(),
});

export const audioHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type ImageHistoryQueryInput = z.infer<typeof imageHistoryQuerySchema>;
export type CodeGenerationInput = z.infer<typeof codeGenerationSchema>;
export type CodeHistoryQueryInput = z.infer<typeof codeHistoryQuerySchema>;
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>;
export type VideoHistoryQueryInput = z.infer<typeof videoHistoryQuerySchema>;
export type ConversationGenerationInput = z.infer<typeof conversationGenerationSchema>;
export type ConversationHistoryQueryInput = z.infer<typeof conversationHistoryQuerySchema>;
export type SessionListQueryInput = z.infer<typeof sessionListQuerySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionParamsInput = z.infer<typeof sessionParamsSchema>;
export type GenerationParamsInput = z.infer<typeof generationParamsSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type AudioGenerationInput = z.infer<typeof audioGenerationSchema>;
export type AudioHistoryQueryInput = z.infer<typeof audioHistoryQuerySchema>;
export type AudioVoiceStyleInput = z.infer<typeof audioVoiceStyleSchema>;
