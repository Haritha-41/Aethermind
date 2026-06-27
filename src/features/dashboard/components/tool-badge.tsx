import { DashboardIcon } from "./dashboard-icon";
import type { DashboardIconName } from "../config/dashboard-navigation";

type ToolBadgeProps = {
  icon: DashboardIconName;
  fg: string;
  bg: string;
};

/** The 32px colored tool chip shown in module headers. */
export function ToolBadge({ icon, fg, bg }: ToolBadgeProps) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-[9px]"
      style={{ background: bg, color: fg }}
    >
      <DashboardIcon name={icon} className="h-[17px] w-[17px]" />
    </div>
  );
}
