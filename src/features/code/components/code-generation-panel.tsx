"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModuleShell } from "@/features/dashboard/components/module-shell";
import { CodeOutputRenderer } from "@/features/code/components/code-output-renderer";
import { AiPromptComposer } from "@/features/dashboard/components/ai-prompt-composer";

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
    <div className="flex h-full min-h-0 flex-col gap-8">
      {/* Model */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-xs font-semibold text-slate-100">Code Model</h3>
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
    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
      {isLoadingHistory ? (
        <div className="flex items-center justify-center h-full">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#14b8a6]" />
        </div>
      ) : sortedHistory.length === 0 ? (
        <div className="flex items-center justify-center h-full flex-col text-slate-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-slate-600">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <p className="text-sm">No code generated yet.</p>
          <p className="text-xs mt-1 text-slate-500">Use the prompt below to generate code.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {sortedHistory.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#2d313a] bg-[#18191e] overflow-hidden">
              <div className="bg-[#111215] px-5 py-3 border-b border-[#2d313a] flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300 line-clamp-1 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 shrink-0">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  {item.prompt}
                </p>
                <span className="text-[10px] text-slate-500 whitespace-nowrap ml-4">{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="p-5 overflow-x-auto">
                <CodeOutputRenderer content={item.output} />
              </div>
            </div>
          ))}
          
          <div className="mt-8 text-center pb-8">
            <button className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto">
              Load More 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const promptSlot = (
    <AiPromptComposer
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleGenerate}
      placeholder="Describe the code you want to generate in detail..."
      isSubmitting={isSubmitting}
      submitLabel="Generate Code"
      submittingLabel="Generating..."
      tip="Tip: Be specific about framework logic and libraries you want to use."
      errorMessage={errorMessage}
    />
  );

  return (
    <ModuleShell
      title="Code Generation"
      usage={usage}
      sidebarSlot={sidebarSlot}
      contentSlot={contentSlot}
      promptSlot={promptSlot}
    />
  );
}
