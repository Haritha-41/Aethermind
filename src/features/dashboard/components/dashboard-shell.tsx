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
import { TextGenerationPanel } from "@/features/text/components/text-generation-panel";
import { VideoGenerationPanel } from "@/features/video/components/video-generation-panel";

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
  const activeSectionLabel =
    dashboardNavItems.find((item) => item.key === activeSection)?.label ?? "Dashboard";

  return (
    <main className="min-h-screen bg-[#0f1115] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-[#2d313a] lg:flex">
          <Link href="/" className="flex items-center gap-3 px-6 py-6 text-slate-100 hover:text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14b8a6] text-sm font-semibold text-slate-900">
              A
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-100">Aethermind</p>
          </Link>

          <nav className="flex-1 space-y-2 px-4 pt-4">
            {dashboardNavItems.map((item) => {
              const isActive = item.key === activeSection;
              return (
                <Link
                  key={item.key}
                  href={item.key === "dashboard" ? "/dashboard" : `/dashboard?section=${item.key}`}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#14b8a626] text-[#14b8a6]"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <span className="inline-flex min-w-5 justify-center">
                    <DashboardIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#2d313a] p-4">
            <Link
              href="/admin/login"
              className="mb-3 flex items-center gap-2 rounded-lg border border-[#2d313a] bg-[#171b25] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-[#14b8a6] hover:text-[#14b8a6]"
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#2d313a] bg-[#0f1115] text-xs"
                aria-hidden
              >
                A
              </span>
              <span>Admin panel</span>
            </Link>
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100">
                {getInitials(user)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">
                  {user.name || "Aethermind User"}
                </p>
                <p className="truncate text-xs text-slate-400">Basic Plan</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 px-5 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 lg:hidden">
            <Link href="/" className="block text-slate-100 hover:text-slate-100">
              <p className="text-lg font-bold text-slate-100">Aethermind</p>
              <p className="text-sm text-slate-400">AI Dashboard</p>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/login"
                className="rounded-md border border-[#2d313a] px-3 py-2 text-sm text-slate-200 hover:border-[#14b8a6] hover:text-[#14b8a6]"
              >
                Admin
              </Link>
              <LogoutButton variant="dark" />
            </div>
          </header>

          <nav className="mb-8 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {dashboardNavItems.map((item) => {
              const isActive = item.key === activeSection;
              return (
                <Link
                  key={item.key}
                  href={item.key === "dashboard" ? "/dashboard" : `/dashboard?section=${item.key}`}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "border-[#14b8a6] bg-[#14b8a626] text-[#14b8a6]"
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

          <div className="mx-auto w-full max-w-[1480px]">
            <header className="mb-10 hidden items-center justify-between gap-4 lg:flex">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-100">
                  {activeSection === "dashboard" ? "Welcome back" : activeSectionLabel}
                </h1>
                <p className="mt-2 text-lg text-slate-400">
                  {activeSection === "dashboard"
                    ? "Choose an AI tool to get started."
                    : "Work inside your selected AI module."}
                </p>
              </div>
              <LogoutButton variant="dark" />
            </header>

            <header className="mb-8 lg:hidden">
              <h1 className="text-3xl font-bold tracking-tight text-slate-100">
                {activeSection === "dashboard" ? "Welcome back" : activeSectionLabel}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {activeSection === "dashboard"
                  ? "Choose an AI tool to get started."
                  : "Work inside your selected AI module."}
              </p>
            </header>

            {activeSection === "dashboard" ? (
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
            ) : null}

            {activeSection === "text" ? <TextGenerationPanel /> : null}
            {activeSection === "code" ? <CodeGenerationPanel /> : null}
            {activeSection === "image" ? <ImageGenerationPanel /> : null}
            {activeSection === "video" ? <VideoGenerationPanel /> : null}
            {activeSection === "conversation" ? <ConversationPanel /> : null}

            {activeSection !== "dashboard" &&
            activeSection !== "text" &&
            activeSection !== "code" &&
            activeSection !== "image" &&
            activeSection !== "video" &&
            activeSection !== "conversation" ? (
              <div className="rounded-2xl border border-[#2d313a] bg-[#11141b] p-6">
                <p className="text-sm text-slate-300">
                  This module is scheduled in an upcoming phase.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
