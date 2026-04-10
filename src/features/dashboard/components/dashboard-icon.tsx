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
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "dashboard") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  }

  if (name === "code") {
    return (
      <svg {...commonProps}>
        <path d="M8 8 4 12l4 4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m13.5 5-3 14" />
      </svg>
    );
  }

  if (name === "text") {
    return (
      <svg {...commonProps}>
        <path d="M4 6h16" />
        <path d="M4 10h11" />
        <path d="M4 14h16" />
        <path d="M4 18h9" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m21 16-5.5-5.5L8 18" />
      </svg>
    );
  }

  if (name === "video") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="7" width="13" height="10" rx="2" />
        <path d="m16 10 5-3v10l-5-3z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8 11h8" />
      <path d="M8 14h5" />
    </svg>
  );
}
