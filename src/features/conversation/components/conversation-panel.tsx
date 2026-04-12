"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { CodeOutputRenderer } from "@/features/code/components/code-output-renderer";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

import type {
  AiSessionDto,
  AiErrorDto,
  ConversationCreateSessionResponseDto,
  ConversationHistoryItemDto,
  ConversationHistoryResponseDto,
  ConversationResponseDto,
  ConversationSessionsResponseDto,
  ConversationUpdateSessionResponseDto,
  ConversationUsageDto,
  SessionDeleteResponseDto,
} from "@/types/ai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_HISTORY_LIMIT = 20;
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

function formatSessionDate(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(timestampMs));
}

export function ConversationPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [sessions, setSessions] = useState<AiSessionDto[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationHistoryItemDto[]>([]);
  const [usage, setUsage] = useState<ConversationUsageDto | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRenamingSessionId, setIsRenamingSessionId] = useState<string | null>(null);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const threadBottomRef = useRef<HTMLDivElement | null>(null);
  const historyRequestIdRef = useRef(0);
  const sessionsRequestIdRef = useRef(0);

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        return left.createdAt - right.createdAt;
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

      const response = await fetch(`/api/ai/conversation?${searchParams.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        if (requestId !== historyRequestIdRef.current) {
          return;
        }
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load conversation history.");
        return;
      }

      const payload = (await response.json()) as ConversationHistoryResponseDto;
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
      const response = await fetch(`/api/ai/conversation/sessions?limit=${DEFAULT_SESSION_LIMIT}`, {
        method: "GET",
      });
      if (!response.ok) {
        if (requestId !== sessionsRequestIdRef.current) {
          return;
        }
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load conversation sessions.");
        return;
      }

      const payload = (await response.json()) as ConversationSessionsResponseDto;
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

  useEffect(() => {
    if (threadBottomRef.current) {
      setTimeout(() => {
        threadBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [sortedHistory, isLoadingHistory]);

  async function handleSendMessage() {
    if (!prompt.trim()) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/conversation", {
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
        setErrorMessage(errorPayload.error || "Conversation message failed.");
        return;
      }

      const payload = (await response.json()) as ConversationResponseDto;
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
      const response = await fetch("/api/ai/conversation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prompt.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not create conversation session.");
        return;
      }

      const payload = (await response.json()) as ConversationCreateSessionResponseDto;
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
      const response = await fetch(`/api/ai/conversation/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        const errorPayload = await parseAiErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not rename session.");
        return;
      }

      const payload = (await response.json()) as ConversationUpdateSessionResponseDto;
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
      `Delete "${targetSession.title}"? This will remove all conversation history in this session.`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeletingSessionId(sessionId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/ai/conversation/sessions/${sessionId}`, {
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
    <div className="flex h-full min-h-0 flex-col gap-8">
      {/* Model */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Conversation Model</h3>
        </div>
        <div className="relative">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#2d313a] bg-[#111215] px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#14b8a6]"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Sessions */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-[#24262d] pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-100">Previous Sessions</h3>
          <button
            type="button"
            onClick={() => void handleCreateSession()}
            disabled={isCreatingSession}
            className="rounded-md border border-[#2d313a] bg-[#111215] px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-[#14b8a6] hover:text-slate-100 disabled:opacity-50"
          >
            {isCreatingSession ? "Creating..." : "New"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadSessions(activeSessionId);
            void loadHistory(activeSessionId);
          }}
          className="w-full rounded-md border border-[#2d313a] bg-[#111215] px-3 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:border-[#14b8a6] hover:text-slate-100"
        >
          Refresh Session
        </button>

        <div className="custom-scrollbar flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
          {isLoadingSessions ? (
            <p className="text-[11px] text-slate-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-[11px] text-slate-500">No sessions yet.</p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = session.id === editingSessionId;
              const isRenaming = session.id === isRenamingSessionId;
              const isDeleting = session.id === isDeletingSessionId;
              return (
                <div
                  key={session.id}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "border-[#14b8a6] bg-[#182a29]"
                      : "border-[#2d313a] bg-[#111215] hover:border-[#14b8a6]/60"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editingSessionTitle}
                        onChange={(event) => setEditingSessionTitle(event.target.value)}
                        className="w-full rounded-md border border-[#2d313a] bg-[#0f1115] px-2 py-1 text-xs text-slate-100 outline-none focus:border-[#14b8a6]"
                        maxLength={80}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRenameSession(session.id)}
                          disabled={isRenaming}
                          className="rounded-md border border-[#2d313a] bg-[#111215] px-2 py-1 text-[11px] text-slate-200 hover:border-[#14b8a6] disabled:opacity-50"
                        >
                          {isRenaming ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRenamingSession}
                          className="rounded-md border border-[#2d313a] bg-[#111215] px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
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
                        <p className="truncate text-xs font-medium text-slate-100">{session.title}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {formatSessionDate(session.lastActivityAt)}
                        </p>
                      </button>
                      <div className="mt-0.5 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => beginRenamingSession(session)}
                          className="rounded-md border border-[#2d313a] bg-[#111215] p-1 text-slate-400 hover:border-[#14b8a6] hover:text-slate-100"
                          aria-label={`Rename ${session.title}`}
                          title="Rename session"
                        >
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
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSession(session.id)}
                          disabled={isDeleting}
                          className="rounded-md border border-rose-900/50 bg-rose-950/20 p-1 text-rose-300 hover:bg-rose-950/35 disabled:opacity-50"
                          aria-label={`Delete ${session.title}`}
                          title="Delete session"
                        >
                          {isDeleting ? (
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
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
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
    </div>
  );

  const contentSlot = (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
      {isLoadingHistory ? (
        <div className="flex items-center justify-center h-full">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#14b8a6]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex items-center justify-center h-full flex-col text-slate-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-slate-600">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm">No messages yet.</p>
          <p className="text-xs mt-1 text-slate-500">Start the conversation below.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto pb-6">
          {sortedHistory.map((entry) => (
            <div key={entry.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#24555f] bg-[#11353c] px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[#7ed4c9] mb-1">You</p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-100">{entry.prompt}</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[#2d313a] bg-[#18191e] px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[#14b8a6]">Assistant</p>
                    <span className="text-[10px] text-slate-500 px-1 border border-[#2d313a] rounded-md">{entry.model}</span>
                  </div>
                  <div className="overflow-x-auto break-words">
                    <CodeOutputRenderer content={entry.output} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={threadBottomRef} />
        </div>
      )}
    </div>
  );

  const promptSlot = (
    <AiPromptComposer
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleSendMessage}
      placeholder="Message Assistant..."
      isSubmitting={isSubmitting}
      submitLabel="Send"
      submittingLabel="Sending..."
      tip="Tip: Press Enter to send, and Shift+Enter for a new line."
      errorMessage={errorMessage}
      clearLabel="Clear message"
    />
  );

  return (
    <ModuleShell
      title="Conversation"
      usage={usage}
      sidebarSlot={sidebarSlot}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
