import Link from "next/link";

import type { AuthUser } from "@/server/services/auth/types";

import {
  dashboardNavItems,
  dashboardToolCards,
  type DashboardSectionKey,
} from "../config/dashboard-navigation";
import { DashboardIcon } from "./dashboard-icon";
import { CodeGenerationPanel } from "@/features/code/components/code-generation-panel";
import { ConversationPanel } from "@/features/conversation/components/conversation-panel";
import { ImageGenerationPanel } from "@/features/image/components/image-generation-panel";
import { VideoGenerationPanel } from "@/features/video/components/video-generation-panel";
import { AudioGenerationPanel } from "@/features/audio/components/audio-generation-panel";

import { LogoutButton } from "@/features/auth/components/logout-button";

type DashboardShellProps = {
  user: AuthUser;
  activeSection: DashboardSectionKey;
};

function getInitials(user: AuthUser): string {
  if (user.name?.trim()) {
    const tokens = user.name.trim().split(/\s+/);
    return tokens
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join("");
  }

  return user.email.charAt(0).toUpperCase();
}

export function DashboardShell({ user, activeSection }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-[#18191e] text-slate-100 flex flex-col lg:flex-row">
      <aside className="hidden w-[260px] flex-col border-r border-[#24262d] bg-[#111215] lg:flex shrink-0">
        <Link href="/" className="flex items-center gap-3 px-6 py-6 text-slate-100 hover:text-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14b8a6] text-[#0f1115]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </div>
          <p className="text-xl font-bold tracking-tight text-slate-100">Aethermind</p>
        </Link>

        <nav className="flex-1 space-y-1 px-3 pt-2">
          {dashboardNavItems.map((item) => {
            const isActive = item.key === activeSection;
            return (
              <Link
                key={item.key}
                href={item.key === "dashboard" ? "/dashboard" : `/dashboard?section=${item.key}`}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#182a29] text-[#29a093]"
                    : "text-slate-400 hover:bg-[#1f2128] hover:text-slate-200"
                }`}
              >
                <span className="inline-flex min-w-5 justify-center">
                  <DashboardIcon name={item.icon} className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-100">
              {getInitials(user)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">
                {user.name || "Aethermind User"}
              </p>
              <p className="truncate text-xs text-slate-400">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="flex flex-wrap items-center justify-between gap-4 p-5 lg:hidden border-b border-[#2d313a] bg-[#111215]">
          <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-slate-100">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#14b8a6] text-[#0f1115]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-100">Aethermind</p>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-lg border border-[#2d313a] bg-[#111215] px-3 text-sm font-semibold text-slate-200 transition-colors hover:border-[#14b8a6] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]/70"
            >
              Admin Panel
            </Link>
            <LogoutButton variant="dark" />
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto p-4 lg:hidden border-b border-[#2d313a] bg-[#111215]">
          {dashboardNavItems.map((item) => {
            const isActive = item.key === activeSection;
            return (
              <Link
                key={item.key}
                href={item.key === "dashboard" ? "/dashboard" : `/dashboard?section=${item.key}`}
                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "border-[#14b8a6] bg-[#182a29] text-[#14b8a6]"
                    : "border-[#2d313a] text-slate-300"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <DashboardIcon name={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeSection === "dashboard" ? (
            <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 lg:p-10 xl:p-12">
              <div className="mx-auto max-w-[1480px]">
                <header className="mb-10 items-center justify-between gap-4 flex">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-slate-100">
                      Welcome back
                    </h1>
                    <p className="mt-2 text-lg text-slate-400">
                      Choose an AI tool to get started.
                    </p>
                  </div>
                  <div className="hidden lg:flex items-center gap-2">
                    <Link
                      href="/admin"
                      className="inline-flex h-10 items-center rounded-lg border border-[#2d313a] bg-[#111215] px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-[#14b8a6] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]/70"
                    >
                      Admin Panel
                    </Link>
                    <LogoutButton variant="dark" />
                  </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dashboardToolCards.map((tool) => (
                    <Link
                      key={tool.key}
                      href={`/dashboard?section=${tool.key}`}
                      className="group rounded-2xl border border-[#2d313a] bg-[#11141b] p-6 transition hover:border-slate-500/70 hover:bg-[#171b25]"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-semibold ${tool.badgeClassName}`}
                        >
                          <DashboardIcon name={tool.icon} className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-100">{tool.title}</h2>
                          <p className="mt-1 text-sm text-slate-400">{tool.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeSection !== "dashboard" && activeSection !== "image" && (
            <>
              {activeSection === "code" ? <CodeGenerationPanel /> : null}
              {activeSection === "audio" ? <AudioGenerationPanel /> : null}
              {activeSection === "video" ? <VideoGenerationPanel /> : null}
              {activeSection === "conversation" ? <ConversationPanel /> : null}
            </>
          )}

          {activeSection === "image" ? <ImageGenerationPanel /> : null}
        </div>
      </section>
    </main>
  );
}
