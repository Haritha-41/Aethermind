import Link from "next/link";

import type { AuthUser } from "@/server/services/auth/types";

import {
  dashboardNavItems,
  dashboardToolCards,
  navGroupOrder,
  type DashboardSectionKey,
} from "../config/dashboard-navigation";
import { DashboardIcon } from "./dashboard-icon";
import { SettingsPanel } from "./settings-panel";
import { CodeGenerationPanel } from "@/features/code/components/code-generation-panel";
import { ConversationPanel } from "@/features/conversation/components/conversation-panel";
import { ImageGenerationPanel } from "@/features/image/components/image-generation-panel";
import { VideoGenerationPanel } from "@/features/video/components/video-generation-panel";
import { AudioGenerationPanel } from "@/features/audio/components/audio-generation-panel";
import { AdminDashboardPanel } from "@/features/admin/components/admin-dashboard-panel";
import { LogoutButton } from "@/features/auth/components/logout-button";

type DashboardShellProps = {
  user: AuthUser;
  activeSection: DashboardSectionKey;
};

const PLAN_LABEL = "Pro";

function getInitials(user: AuthUser): string {
  if (user.name?.trim()) {
    return user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join("");
  }
  return user.email.charAt(0).toUpperCase();
}

function sectionHref(key: DashboardSectionKey): string {
  return key === "dashboard" ? "/dashboard" : `/dashboard?section=${key}`;
}

// ---- Home bento mock data (static reskin, styling only) ----
const MINI_BARS = [40, 62, 48, 80, 55, 72, 90, 68, 84, 58];
const HOME_THUMBS = [
  { c1: "#E8C39E", c2: "#B8743A" },
  { c1: "#6E5BC9", c2: "#2A1F5E" },
  { c1: "#CFE0EC", c2: "#7E97AC" },
  { c1: "#E8D49A", c2: "#3E7A4E" },
];
const ACTIVITY: {
  type: "image" | "chat" | "video" | "audio";
  bg: string;
  fg: string;
  title: string;
  meta: string;
  time: string;
}[] = [
  { type: "image", bg: "#FBECEC", fg: "#D2685F", title: "A cinematic burger, golden light", meta: "Image · Flux 1.1 Pro", time: "2m" },
  { type: "chat", bg: "#E7F4EF", fg: "#0E9F77", title: "Associate dean roles and responsibilities", meta: "Chat · Gemini 2.5", time: "1h" },
  { type: "video", bg: "#E9EFFB", fg: "#5A7FD6", title: "Aerial shot of the Empire State building", meta: "Video · Kling 1.5", time: "3h" },
  { type: "audio", bg: "#F0EBFB", fg: "#8A6FD0", title: "Hello, welcome to Aethermind", meta: "Audio · Chatterbox", time: "1d" },
];

function HomeView({ user }: { user: AuthUser }) {
  const initials = getInitials(user);
  const userName = user.name?.trim() || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1180px] px-9 pb-14 pt-[30px]">
      {/* greeting row */}
      <div className="mb-[22px] flex items-center justify-between">
        <div>
          <div className="mb-[3px] text-[12.5px] font-medium text-[#9A9A92]">{today}</div>
          <h1 className="m-0 text-[27px] font-semibold tracking-[-0.025em]">
            {greeting}, {userName}
          </h1>
        </div>
        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[7px] rounded-[10px] border border-[#ECECE8] bg-white px-[13px] py-2 text-[13px] font-medium text-[#3A3A36] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
            <span className="h-2 w-2 rounded-full bg-[#13A77E]" /> All systems online
          </div>
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1B1B18] text-[13px] font-semibold text-white">
            {initials}
          </div>
        </div>
      </div>

      {/* bento grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* hero */}
        <div className="anim-fade-up relative col-[1/4] row-[1/3] overflow-hidden rounded-[24px] bg-[#0E1413] shadow-[0_20px_50px_-22px_rgba(11,50,40,0.6)]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="anim-aurora absolute left-[-6%] top-[-60%] h-[240%] w-[62%] bg-[radial-gradient(circle,rgba(19,167,126,0.55),rgba(19,167,126,0.12)_35%,transparent_62%)]" />
            <div className="anim-aurora2 absolute right-[-6%] top-[-70%] h-[240%] w-[56%] bg-[radial-gradient(circle,rgba(20,130,190,0.42),rgba(20,130,190,0.1)_35%,transparent_62%)]" />
            <div className="anim-aurora absolute left-[38%] top-[-30%] h-[200%] w-[40%] bg-[radial-gradient(circle,rgba(150,120,235,0.3),transparent_60%)]" />
          </div>
          <div className="relative flex h-full flex-col justify-center px-[34px] py-8">
            <div className="mb-4 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[rgba(173,224,206,0.9)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5Z" />
              </svg>
              Aethermind Studio
            </div>
            <h2 className="m-0 mb-5 max-w-[520px] text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] text-white">
              What would you like to create today?
            </h2>
            <Link
              href={sectionHref("conversation")}
              className="flex max-w-[620px] items-center gap-[14px] rounded-[15px] border border-white/[0.16] bg-white/[0.09] px-[18px] py-[15px]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <div className="flex-1 text-[15.5px] text-white/50">Describe what you want to make…</div>
              <kbd className="rounded-md border border-white/[0.22] px-2 py-[3px] text-[11px] text-white/55">⏎</kbd>
            </Link>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {dashboardToolCards.map((tool) => (
                <Link
                  key={tool.key}
                  href={sectionHref(tool.key)}
                  className="flex items-center gap-[7px] rounded-[9px] border border-white/[0.16] bg-white/10 px-3 py-[7px] text-[12.5px] font-medium text-white transition-colors hover:bg-white/[0.18]"
                >
                  <DashboardIcon name={tool.icon} className="h-3.5 w-3.5" />
                  {tool.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* credits tile */}
        <div className="col-[4/5] row-[1/2] flex min-h-[148px] flex-col justify-between rounded-[20px] bg-[linear-gradient(150deg,#10A57C,#0B7A5E)] p-5 text-white shadow-[0_14px_30px_-16px_rgba(11,122,94,0.6)]">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-white/85">Credits</span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div>
            <div className="text-[30px] font-semibold leading-none tracking-[-0.02em]">3,420</div>
            <div className="mt-1 text-[12px] text-white/80">of 10,000 remaining</div>
            <div className="mt-[11px] h-[6px] overflow-hidden rounded-[6px] bg-white/25">
              <div className="h-full w-[34%] rounded-[6px] bg-white" />
            </div>
          </div>
        </div>

        {/* generations tile */}
        <div className="col-[4/5] row-[2/3] flex min-h-[148px] flex-col justify-between rounded-[20px] border border-[#ECECE8] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-[#8C8C84]">Generations</span>
            <span className="rounded-[7px] bg-[#E7F4EF] px-2 py-[3px] text-[11.5px] font-semibold text-[#13A77E]">↑ 18%</span>
          </div>
          <div>
            <div className="text-[30px] font-semibold leading-none tracking-[-0.02em]">248</div>
            <div className="mt-[10px] flex items-center gap-2">
              <div className="flex h-[26px] items-end gap-[3px]">
                {MINI_BARS.map((value, index) => (
                  <div
                    key={index}
                    className="w-[5px] rounded-[2px] bg-[#CDEAE0]"
                    style={{ height: Math.round((value / 100) * 24) + 2 }}
                  />
                ))}
              </div>
              <span className="text-[11.5px] text-[#9A9A92]">this month</span>
            </div>
          </div>
        </div>

        {/* tool strip */}
        <div className="col-[1/5] row-[3/4] grid grid-cols-5 gap-[14px]">
          {dashboardToolCards.map((tool) => (
            <Link
              key={tool.key}
              href={sectionHref(tool.key)}
              className="lift rounded-[18px] border border-[#ECECE8] bg-white p-[17px] text-left shadow-[0_1px_2px_rgba(20,20,18,0.03)]"
            >
              <div
                className="mb-[13px] flex h-10 w-10 items-center justify-center rounded-[11px]"
                style={{ background: tool.accent.bg, color: tool.accent.fg }}
              >
                <DashboardIcon name={tool.icon} className="h-5 w-5" />
              </div>
              <div className="mb-[2px] text-[14.5px] font-semibold">{tool.title}</div>
              <div className="text-[12px] leading-[1.4] text-[#9A9A92]">{tool.description}</div>
            </Link>
          ))}
        </div>

        {/* recent creations */}
        <div className="col-[1/3] row-[4/5] rounded-[20px] border border-[#ECECE8] bg-white p-[18px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <div className="mb-[14px] flex items-center justify-between">
            <h3 className="m-0 text-[15px] font-semibold">Recent creations</h3>
            <Link href={sectionHref("image")} className="text-[12.5px] font-semibold text-[#0E9F77]">
              Gallery →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-[10px]">
            {HOME_THUMBS.map((thumb, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-[12px]"
                style={{ background: `linear-gradient(150deg, ${thumb.c1}, ${thumb.c2})` }}
              >
                <div className="absolute left-[7px] top-[7px] flex h-5 w-5 items-center justify-center rounded-md bg-black/35 text-white">
                  <DashboardIcon name="image" className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* activity feed */}
        <div className="col-[3/5] row-[4/5] rounded-[20px] border border-[#ECECE8] bg-white p-[18px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="m-0 text-[15px] font-semibold">Recent activity</h3>
            <span className="cursor-pointer text-[12.5px] font-semibold text-[#0E9F77]">View all</span>
          </div>
          <div className="flex flex-col">
            {ACTIVITY.map((item, index) => (
              <div key={index} className="flex items-center gap-[13px] border-b border-[#F4F4F0] px-[2px] py-[11px]">
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                  style={{ background: item.bg, color: item.fg }}
                >
                  <DashboardIcon name={item.type} className="h-[17px] w-[17px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{item.title}</div>
                  <div className="mt-[1px] text-[11.5px] text-[#9A9A92]">{item.meta}</div>
                </div>
                <div className="shrink-0 text-[11.5px] text-[#B0B0A8]">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ user, activeSection }: DashboardShellProps) {
  const initials = getInitials(user);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F6F6F3] text-[#1B1B18]">
      {/* sidebar */}
      <aside className="flex w-[244px] shrink-0 flex-col border-r border-[#ECECE8] bg-white px-[14px] py-[18px]">
        <Link href="/dashboard" className="flex items-center gap-[11px] px-2 pb-5 pt-[6px]">
          <div className="relative h-8 w-8 overflow-hidden rounded-[9px] bg-[linear-gradient(135deg,#10A57C,#0B8366)] shadow-[0_2px_8px_rgba(14,159,119,0.35)]">
            <div className="absolute inset-[-40%] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.55),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center text-[16px] font-semibold text-white">æ</div>
          </div>
          <div className="text-[16px] font-semibold tracking-[-0.02em]">Aethermind</div>
        </Link>

        <nav className="flex flex-col gap-[2px]">
          {navGroupOrder.map((group) => (
            <div key={group}>
              <div className="px-[10px] pb-[6px] pt-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#A6A69E]">
                {group}
              </div>
              {dashboardNavItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const isActive = item.key === activeSection;
                  return (
                    <Link
                      key={item.key}
                      href={sectionHref(item.key)}
                      className={`flex w-full items-center gap-[11px] rounded-[10px] px-[10px] py-[9px] text-[13.5px] transition-colors ${
                        isActive
                          ? "bg-[#E7F4EF] font-semibold text-[#0B8366]"
                          : "font-medium text-[#4A4A44] hover:bg-[#F6F6F3]"
                      }`}
                    >
                      <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-4">
          <div className="mb-3 rounded-[14px] border border-[#E2EFE9] bg-[#F4F8F6] px-[14px] py-[13px]">
            <div className="mb-[9px] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#4B6B5E]">Credits</span>
              <span className="text-[11.5px] text-[#7E9C90]">3,420 left</span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-[6px] bg-[#DCEBE4]">
              <div className="h-full w-[68%] rounded-[6px] bg-[linear-gradient(90deg,#13A77E,#0B8366)]" />
            </div>
            <button className="mt-[11px] w-full rounded-[9px] bg-[#0E9F77] py-2 text-[12.5px] font-semibold text-white">
              Upgrade plan
            </button>
          </div>

          <div className="flex items-center gap-[10px] px-1 py-[6px]">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#1B1B18] text-[12.5px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight">
                {user.name || "Aethermind User"}
              </div>
              <div className="text-[11.5px] text-[#9A9A92]">{PLAN_LABEL} plan</div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 px-1">
            {user.isAdmin ? (
              <Link
                href="/admin"
                className="flex-1 rounded-[9px] border border-[#ECECE8] bg-white py-[7px] text-center text-[12px] font-semibold text-[#3A3A36] transition-colors hover:bg-[#F6F6F3]"
              >
                Admin
              </Link>
            ) : null}
            <LogoutButton variant="light" className="flex-1" />
          </div>
        </div>
      </aside>

      {/* main */}
      <main className="relative h-screen min-w-0 flex-1 overflow-hidden">
        {activeSection === "dashboard" ? (
          <div className="h-full overflow-y-auto">
            <HomeView user={user} />
          </div>
        ) : null}

        {activeSection === "conversation" ? <ConversationPanel /> : null}
        {activeSection === "image" ? <ImageGenerationPanel /> : null}
        {activeSection === "video" ? <VideoGenerationPanel /> : null}
        {activeSection === "audio" ? <AudioGenerationPanel /> : null}
        {activeSection === "code" ? <CodeGenerationPanel /> : null}

        {activeSection === "analytics" ? (
          <div className="h-full overflow-y-auto">
            <AdminDashboardPanel />
          </div>
        ) : null}

        {activeSection === "settings" ? (
          <div className="h-full overflow-y-auto">
            <SettingsPanel user={user} planLabel={PLAN_LABEL} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
