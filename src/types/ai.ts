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

export type TextUsageDto = AiUsageDto;
export type ImageUsageDto = AiUsageDto;
export type CodeUsageDto = AiUsageDto;
export type VideoUsageDto = AiUsageDto;
export type ConversationUsageDto = AiUsageDto;

export type TextGenerationHistoryItemDto = {
  id: string;
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type TextGenerationResultDto = {
  model: string;
  output: string;
  tokensUsed: number;
};

export type TextGenerationResponseDto = {
  generation: TextGenerationResultDto;
  usage: TextUsageDto;
};

export type TextHistoryResponseDto = {
  history: TextGenerationHistoryItemDto[];
  usage: TextUsageDto;
};

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
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type CodeGenerationResultDto = {
  model: string;
  output: string;
  tokensUsed: number;
};

export type CodeGenerationResponseDto = {
  generation: CodeGenerationResultDto;
  usage: CodeUsageDto;
};

export type CodeHistoryResponseDto = {
  history: CodeGenerationHistoryItemDto[];
  usage: CodeUsageDto;
};

export type VideoGenerationHistoryItemDto = {
  id: string;
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type VideoGenerationResultDto = {
  model: string;
  output: string;
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
  prompt: string;
  output: string;
  model: string;
  tokensUsed: number | null;
  createdAt: number;
};

export type ConversationGenerationResultDto = {
  model: string;
  output: string;
  tokensUsed: number;
};

export type ConversationResponseDto = {
  generation: ConversationGenerationResultDto;
  usage: ConversationUsageDto;
};

export type ConversationHistoryResponseDto = {
  history: ConversationHistoryItemDto[];
  usage: ConversationUsageDto;
};

export type AiErrorDto = {
  error: string;
  details?: Record<string, string[] | undefined>;
};
