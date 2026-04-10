export type DashboardSectionKey =
  | "dashboard"
  | "text"
  | "code"
  | "image"
  | "video"
  | "conversation";

export type DashboardIconName =
  | "dashboard"
  | "text"
  | "code"
  | "image"
  | "video"
  | "conversation";

export type DashboardNavItem = {
  key: DashboardSectionKey;
  label: string;
  icon: DashboardIconName;
};

export type DashboardToolCard = {
  key: Exclude<DashboardSectionKey, "dashboard">;
  title: string;
  description: string;
  badgeClassName: string;
  icon: DashboardIconName;
};

export const dashboardNavItems: readonly DashboardNavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "text", label: "Text", icon: "text" },
  { key: "code", label: "Code", icon: "code" },
  { key: "image", label: "Image", icon: "image" },
  { key: "video", label: "Video", icon: "video" },
  { key: "conversation", label: "Conversation", icon: "conversation" },
];

export const dashboardToolCards: readonly DashboardToolCard[] = [
  {
    key: "text",
    title: "Text Generation",
    description: "Generate polished AI text",
    badgeClassName: "bg-cyan-300 text-slate-900",
    icon: "text",
  },
  {
    key: "code",
    title: "Code Generation",
    description: "Write code in any language",
    badgeClassName: "bg-emerald-400 text-slate-900",
    icon: "code",
  },
  {
    key: "image",
    title: "Image Generation",
    description: "Generate stunning visuals",
    badgeClassName: "bg-rose-400 text-slate-900",
    icon: "image",
  },
  {
    key: "video",
    title: "Video Generation",
    description: "Produce AI videos",
    badgeClassName: "bg-sky-400 text-slate-900",
    icon: "video",
  },
  {
    key: "conversation",
    title: "Conversation",
    description: "Chat with AI",
    badgeClassName: "bg-amber-400 text-slate-900",
    icon: "conversation",
  },
];
