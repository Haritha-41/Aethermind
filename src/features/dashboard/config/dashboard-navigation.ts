export type DashboardSectionKey =
  | "dashboard"
  | "code"
  | "audio"
  | "image"
  | "video"
  | "conversation"
  | "analytics"
  | "settings";

export type DashboardIconName =
  | "home"
  | "code"
  | "audio"
  | "image"
  | "video"
  | "chat"
  | "analytics"
  | "settings";

export type DashboardNavGroup = "Workspace" | "Create" | "Account";

export type DashboardNavItem = {
  key: DashboardSectionKey;
  label: string;
  icon: DashboardIconName;
  group: DashboardNavGroup;
};

/** Tool accent palette — mirrors the mockup tints exactly. */
export type ToolAccent = {
  /** icon stroke / text color */
  fg: string;
  /** soft tint background */
  bg: string;
};

export type DashboardToolCard = {
  key: Exclude<DashboardSectionKey, "dashboard" | "analytics" | "settings">;
  title: string;
  description: string;
  icon: DashboardIconName;
  accent: ToolAccent;
};

export const dashboardNavItems: readonly DashboardNavItem[] = [
  { key: "dashboard", label: "Home", icon: "home", group: "Workspace" },
  { key: "conversation", label: "Chat", icon: "chat", group: "Create" },
  { key: "image", label: "Image", icon: "image", group: "Create" },
  { key: "video", label: "Video", icon: "video", group: "Create" },
  { key: "audio", label: "Audio", icon: "audio", group: "Create" },
  { key: "code", label: "Code", icon: "code", group: "Create" },
  { key: "analytics", label: "Analytics", icon: "analytics", group: "Account" },
  { key: "settings", label: "Settings", icon: "settings", group: "Account" },
];

export const navGroupOrder: readonly DashboardNavGroup[] = [
  "Workspace",
  "Create",
  "Account",
];

/** Per-tool accent colors, keyed by section. */
export const toolAccents: Record<
  "conversation" | "image" | "video" | "audio" | "code",
  ToolAccent
> = {
  conversation: { fg: "#0E9F77", bg: "#E7F4EF" },
  image: { fg: "#D2685F", bg: "#FBECEC" },
  video: { fg: "#5A7FD6", bg: "#E9EFFB" },
  audio: { fg: "#8A6FD0", bg: "#F0EBFB" },
  code: { fg: "#C08A2E", bg: "#FBF2E3" },
};

export const dashboardToolCards: readonly DashboardToolCard[] = [
  {
    key: "conversation",
    title: "Chat",
    description: "Frontier models",
    icon: "chat",
    accent: toolAccents.conversation,
  },
  {
    key: "image",
    title: "Image",
    description: "Stunning visuals",
    icon: "image",
    accent: toolAccents.image,
  },
  {
    key: "video",
    title: "Video",
    description: "Cinematic clips",
    icon: "video",
    accent: toolAccents.video,
  },
  {
    key: "audio",
    title: "Audio",
    description: "Lifelike voices",
    icon: "audio",
    accent: toolAccents.audio,
  },
  {
    key: "code",
    title: "Code",
    description: "Any language",
    icon: "code",
    accent: toolAccents.code,
  },
];
