import type { DashboardIconName } from "../config/dashboard-navigation";

type DashboardIconProps = {
  name: DashboardIconName;
  className?: string;
};

export function DashboardIcon({ name, className }: DashboardIconProps) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    );
  }

  if (name === "chat") {
    return (
      <svg {...commonProps}>
        <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    );
  }

  if (name === "video") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="13" height="14" rx="3" />
        <path d="m16 9 5-3v12l-5-3" />
      </svg>
    );
  }

  if (name === "audio") {
    return (
      <svg {...commonProps}>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    );
  }

  if (name === "code") {
    return (
      <svg {...commonProps}>
        <path d="m8 7-5 5 5 5" />
        <path d="m16 7 5 5-5 5" />
      </svg>
    );
  }

  if (name === "analytics") {
    return (
      <svg {...commonProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  // settings (gear)
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
    </svg>
  );
}
