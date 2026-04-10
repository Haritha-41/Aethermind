import { z } from "zod";

const modelNameSchema = z
  .string()
  .trim()
  .max(80, "Model name must be 80 characters or less.")
  .regex(/^[a-z0-9][a-z0-9.-]{0,79}$/i, "Model contains unsupported characters.");

export const textGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(4000, "Prompt must be 4000 characters or less."),
  model: modelNameSchema.optional(),
});

export const textHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(2000, "Prompt must be 2000 characters or less."),
  model: modelNameSchema.optional(),
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
});

export const codeHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const videoGenerationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, "Prompt must be at least 5 characters.")
    .max(2000, "Prompt must be 2000 characters or less."),
  model: modelNameSchema.optional(),
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
});

export const conversationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type TextGenerationInput = z.infer<typeof textGenerationSchema>;
export type TextHistoryQueryInput = z.infer<typeof textHistoryQuerySchema>;
export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type ImageHistoryQueryInput = z.infer<typeof imageHistoryQuerySchema>;
export type CodeGenerationInput = z.infer<typeof codeGenerationSchema>;
export type CodeHistoryQueryInput = z.infer<typeof codeHistoryQuerySchema>;
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>;
export type VideoHistoryQueryInput = z.infer<typeof videoHistoryQuerySchema>;
export type ConversationGenerationInput = z.infer<typeof conversationGenerationSchema>;
export type ConversationHistoryQueryInput = z.infer<typeof conversationHistoryQuerySchema>;
