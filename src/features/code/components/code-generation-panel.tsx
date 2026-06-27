"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { ModelPicker, type ModelOption } from "@/features/dashboard/components/model-picker";
import { ToolBadge } from "@/features/dashboard/components/tool-badge";
import { toolAccents } from "@/features/dashboard/config/dashboard-navigation";
import { CodeOutputRenderer } from "@/features/code/components/code-output-renderer";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

const MODEL_OPTIONS: readonly ModelOption[] = [
  { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", dot: "#4285F4", tag: "Fastest" },
];

import type {
  AiSessionDto,
  AiErrorDto,
  CodeCreateSessionResponseDto,
  CodeGenerationHistoryItemDto,
  CodeGenerationResponseDto,
  CodeHistoryResponseDto,
  CodeSessionsResponseDto,
  CodeUpdateSessionResponseDto,
  CodeUsageDto,
  SessionDeleteResponseDto,
} from "@/types/ai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_SESSION_LIMIT = 20;

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

function formatSessionDate(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(timestampMs));
}

export function CodeGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [sessions, setSessions] = useState<AiSessionDto[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<CodeGenerationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<CodeUsageDto | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const historyRequestIdRef = useRef(0);
  const sessionsRequestIdRef = useRef(0);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        return right.createdAt - left.createdAt;
      }),
    [history],
  );

  const loadHistory = useCallback(async (sessionId?: string | null) => {
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const targetSessionId = sessionId ?? activeSessionId;
      if (!targetSessionId) {
        if (requestId === historyRequestIdRef.current) {
          setHistory([]);
          setIsLoadingHistory(false);
        }
        return;
      }

      const searchParams = new URLSearchParams({
        limit: String(DEFAULT_HISTORY_LIMIT),
        sessionId: targetSessionId,
      });

      const response = await fetch(`/api/ai/code?${searchParams.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        if (requestId !== historyRequestIdRef.current) {
          return;
        }
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load code history.");
        return;
      }

      const payload = (await response.json()) as CodeHistoryResponseDto;
      if (requestId !== historyRequestIdRef.current) {
        return;
      }
      setHistory(payload.history);
      setUsage(payload.usage);
      if (payload.sessionId) {
        setActiveSessionId(payload.sessionId);
      }
    } catch {
      if (requestId !== historyRequestIdRef.current) {
        return;
      }
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      if (requestId === historyRequestIdRef.current) {
        setIsLoadingHistory(false);
      }
    }
  }, [activeSessionId]);

  const loadSessions = useCallback(async (preferredSessionId?: string | null) => {
    const requestId = sessionsRequestIdRef.current + 1;
    sessionsRequestIdRef.current = requestId;
    setIsLoadingSessions(true);

    try {
      const response = await fetch(`/api/ai/code/sessions?limit=${DEFAULT_SESSION_LIMIT}`, {
        method: "GET",
      });
      if (!response.ok) {
        if (requestId !== sessionsRequestIdRef.current) {
          return;
        }
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load code sessions.");
        return;
      }

      const payload = (await response.json()) as CodeSessionsResponseDto;
      if (requestId !== sessionsRequestIdRef.current) {
        return;
      }
      setSessions(payload.sessions);
      setActiveSessionId((current) => {
        const selectedId =
          (preferredSessionId &&
            payload.sessions.some((session) => session.id === preferredSessionId) &&
            preferredSessionId) ||
          (current && payload.sessions.some((session) => session.id === current) && current) ||
          payload.sessions[0]?.id ||
          null;
        return selectedId;
      });
    } catch {
      if (requestId !== sessionsRequestIdRef.current) {
        return;
      }
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      if (requestId === sessionsRequestIdRef.current) {
        setIsLoadingSessions(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadHistory(activeSessionId);
  }, [activeSessionId, loadHistory]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          sessionId: activeSessionId ?? undefined,
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Code generation failed.");
        return;
      }

      const payload = (await response.json()) as CodeGenerationResponseDto;
      setUsage(payload.usage);
      setPrompt("");
      setActiveSessionId(payload.generation.sessionId);
      await loadSessions(payload.generation.sessionId);
      await loadHistory(payload.generation.sessionId);
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateSession() {
    setIsCreatingSession(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/code/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prompt.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not create session.");
        return;
      }

      const payload = (await response.json()) as CodeCreateSessionResponseDto;
      setSessions((current) => [payload.session, ...current]);
      setActiveSessionId(payload.session.id);
      setHistory([]);
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsCreatingSession(false);
    }
  }

  function beginRenamingSession(session: AiSessionDto) {
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title);
    setErrorMessage(null);
  }

  function cancelRenamingSession() {
    setEditingSessionId(null);
    setEditingSessionTitle("");
  }

  async function handleRenameSession(sessionId: string) {
    const title = editingSessionTitle.trim();
    if (!title) {
      setErrorMessage("Session title cannot be empty.");
      return;
    }

    setIsRenamingSessionId(sessionId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/code/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not rename session.");
        return;
      }

      const payload = (await response.json()) as CodeUpdateSessionResponseDto;
      setSessions((current) =>
        current.map((session) => (session.id === sessionId ? payload.session : session)),
      );
      cancelRenamingSession();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsRenamingSessionId(null);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    const targetSession = sessions.find((session) => session.id === sessionId);
    if (!targetSession) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${targetSession.title}"? This will remove all code history in this session.`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeletingSessionId(sessionId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/code/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not delete session.");
        return;
      }

      const deletePayload = (await response.json()) as SessionDeleteResponseDto;
      if (!deletePayload.success) {
        setErrorMessage("Could not delete session.");
        return;
      }
      const remainingSessions = sessions.filter((session) => session.id !== sessionId);
      setSessions(remainingSessions);
      cancelRenamingSession();

      const nextSessionId = remainingSessions[0]?.id ?? null;
      setActiveSessionId(nextSessionId);
      if (!nextSessionId) {
        setHistory([]);
      }
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsDeletingSessionId(null);
    }
  }

  const sidebarSlot = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-[18px] pb-[10px] pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A6A69E]">Sessions</span>
        <button
          type="button"
          onClick={() => void handleCreateSession()}
          disabled={isCreatingSession}
          className="flex items-center gap-[5px] rounded-lg bg-[#FBF2E3] px-[10px] py-[5px] text-[12.5px] font-semibold text-[#C08A2E] disabled:opacity-50"
        >
          {isCreatingSession ? "Creating…" : "+ New"}
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {isLoadingSessions ? (
          <p className="px-3 py-2 text-[11.5px] text-[#A6A69E]">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-2 text-[11.5px] text-[#A6A69E]">No sessions yet.</p>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = session.id === editingSessionId;
            const isRenaming = session.id === isRenamingSessionId;
            const isDeleting = session.id === isDeletingSessionId;
            return (
              <div
                key={session.id}
                className={`group mb-[3px] rounded-[11px] px-3 py-[11px] transition-colors ${
                  isActive ? "bg-[#FBF2E3]" : "hover:bg-[#F0F0EC]"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editingSessionTitle}
                      onChange={(event) => setEditingSessionTitle(event.target.value)}
                      className="w-full rounded-md border border-[#E6E6E1] bg-white px-2 py-1 text-[13px] text-[#1B1B18] outline-none focus:border-[#C08A2E]"
                      maxLength={80}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRenameSession(session.id)}
                        disabled={isRenaming}
                        className="rounded-md bg-[#FBF2E3] px-2 py-1 text-[11.5px] font-semibold text-[#C08A2E] disabled:opacity-50"
                      >
                        {isRenaming ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRenamingSession}
                        className="rounded-md px-2 py-1 text-[11.5px] font-medium text-[#9A9A92] hover:text-[#6E6E68]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSessionId(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[13px] font-medium leading-[1.3] text-[#33332E]">{session.title}</p>
                      <p className="mt-[3px] text-[11.5px] text-[#A6A69E]">
                        {formatSessionDate(session.lastActivityAt)}
                      </p>
                    </button>
                    <div className="mt-0.5 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => beginRenamingSession(session)}
                        className="rounded-md p-1 text-[#A6A69E] hover:bg-white hover:text-[#C08A2E]"
                        aria-label={`Rename ${session.title}`}
                        title="Rename session"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSession(session.id)}
                        disabled={isDeleting}
                        className="rounded-md p-1 text-[#C0683E] hover:bg-white disabled:opacity-50"
                        aria-label={`Delete ${session.title}`}
                        title="Delete session"
                      >
                        {isDeleting ? (
                          <span className="px-1 text-[10px]">…</span>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const contentSlot = (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-8 py-7">
      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E6E6E1] border-t-[#C08A2E]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-[#9A9A92]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-[#D6D6CF]">
            <path d="m8 7-5 5 5 5" />
            <path d="m16 7 5 5-5 5" />
          </svg>
          <p className="text-sm">No code generated yet.</p>
          <p className="mt-1 text-xs text-[#B0B0A8]">Use the prompt below to generate code.</p>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[760px] flex-col gap-7">
          {sortedHistory.map((item) => (
            <Fragment key={item.id}>
              <div className="self-end max-w-[80%] rounded-[14px] bg-[#1B1B18] px-4 py-3 text-[14px] leading-relaxed text-white">
                {item.prompt}
              </div>
              <div className="text-[14px] leading-relaxed text-[#2A2A26]">
                <CodeOutputRenderer content={item.output} />
                <div className="mt-2 text-[11px] text-[#B0B0A8]">{formatDateTime(item.createdAt)}</div>
              </div>
            </Fragment>
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
      placeholder="Ask for code, a fix, or an explanation…"
      isSubmitting={isSubmitting}
      submitLabel="Generate Code"
      submittingLabel="Generating..."
      errorMessage={errorMessage}
      variant="icon"
      accent={toolAccents.code.fg}
    />
  );

  return (
    <ModuleShell
      title="Code"
      icon={<ToolBadge icon="code" fg={toolAccents.code.fg} bg={toolAccents.code.bg} />}
      headerRight={<ModelPicker options={MODEL_OPTIONS} value={model} onChange={setModel} />}
      usage={usage}
      sidebarSlot={sidebarSlot}
      sidebarWidth={264}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
      promptMaxWidth={760}
    />
  );
}
