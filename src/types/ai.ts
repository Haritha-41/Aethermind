export type AiUsageDto = {
  planKey: string;
  generation: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
  tokens: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
  periodStartMs: number;
  periodEndMs: number;
};

export type AiSessionKind = "code" | "conversation";

export type AiSessionDto = {
  id: string;
  kind: AiSessionKind;
  title: string;
  createdAt: number;
  lastActivityAt: number;
};

export type ImageUsageDto = AiUsageDto;
export type CodeUsageDto = AiUsageDto;
export type VideoUsageDto = AiUsageDto;
export type ConversationUsageDto = AiUsageDto;

export type ImageGenerationHistoryItemDto = {
  id: string;
  prompt: string;
  output: string;
  model: string;
  imageUrl: string | null;
  tokensUsed: number | null;
  createdAt: number;
};

export type ImageGenerationResultDto = {
  model: string;
  output: string;
  imageUrl: string | null;
  tokensUsed: number;
};

export type ImageGenerationResponseDto = {
  generation: ImageGenerationResultDto;
  usage: ImageUsageDto;
};

export type ImageHistoryResponseDto = {
  history: ImageGenerationHistoryItemDto[];
  usage: ImageUsageDto;
};

export type CodeGenerationHistoryItemDto = {
  id: string;
  sessionId: string | null;
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type CodeGenerationResultDto = {
  sessionId: string;
  model: string;
  output: string;
  tokensUsed: number;
};

export type CodeGenerationResponseDto = {
  generation: CodeGenerationResultDto;
  usage: CodeUsageDto;
};

export type CodeHistoryResponseDto = {
  sessionId: string | null;
  history: CodeGenerationHistoryItemDto[];
  usage: CodeUsageDto;
};

export type CodeSessionsResponseDto = {
  sessions: AiSessionDto[];
};

export type CodeCreateSessionResponseDto = {
  session: AiSessionDto;
};

export type CodeUpdateSessionResponseDto = {
  session: AiSessionDto;
};

export type SessionDeleteResponseDto = {
  success: boolean;
};

export type VideoGenerationHistoryItemDto = {
  id: string;
  prompt: string;
  output: string;
  model: string;
  videoUrl: string | null;
  tokensUsed: number | null;
  createdAt: number;
};

export type VideoGenerationResultDto = {
  model: string;
  output: string;
  videoUrl?: string | null;
  tokensUsed: number;
};

export type VideoGenerationResponseDto = {
  generation: VideoGenerationResultDto;
  usage: VideoUsageDto;
};

export type VideoHistoryResponseDto = {
  history: VideoGenerationHistoryItemDto[];
  usage: VideoUsageDto;
};

export type ConversationHistoryItemDto = {
  id: string;
  sessionId: string | null;
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type ConversationGenerationResultDto = {
  sessionId: string;
  model: string;
  output: string;
  tokensUsed: number;
};

export type ConversationResponseDto = {
  generation: ConversationGenerationResultDto;
  usage: ConversationUsageDto;
};

export type ConversationHistoryResponseDto = {
  sessionId: string | null;
  history: ConversationHistoryItemDto[];
  usage: ConversationUsageDto;
};

export type ConversationSessionsResponseDto = {
  sessions: AiSessionDto[];
};

export type ConversationCreateSessionResponseDto = {
  session: AiSessionDto;
};

export type ConversationUpdateSessionResponseDto = {
  session: AiSessionDto;
};

export type AudioUsageDto = AiUsageDto;

export type AudioGenerationHistoryItemDto = {
  id: string;
  prompt: string;
  output: string;
  model: string;
  audioUrl: string | null;
  tokensUsed: number | null;
  createdAt: number;
};

export type AudioGenerationResultDto = {
  model: string;
  output: string;
  audioUrl?: string | null;
  tokensUsed: number;
};

export type AudioGenerationResponseDto = {
  generation: AudioGenerationResultDto;
  usage: AudioUsageDto;
};

export type AudioHistoryResponseDto = {
  history: AudioGenerationHistoryItemDto[];
  usage: AudioUsageDto;
};

export type AiErrorDto = {
  error: string;
  details?: Record<string, string[] | undefined>;
};
