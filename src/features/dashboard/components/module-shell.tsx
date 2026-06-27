import type { ReactNode } from "react";
import type { AiUsageDto } from "@/types/ai";

export type ModuleShellProps = {
  title: string;
  /** Pre-colored tool badge shown left of the title. */
  icon: ReactNode;
  /** Right side of the header (typically the model picker). */
  headerRight?: ReactNode;
  /** Optional left control / history rail. */
  sidebarSlot?: ReactNode;
  sidebarWidth?: number;
  contentSlot: ReactNode;
  /** Optional docked bottom composer. */
  promptSlot?: ReactNode;
  /** Center the docked composer to this max width (px). */
  promptMaxWidth?: number;
  // ponytail: kept for call-site compatibility; usage is surfaced on Home, not per-tool.
  usage?: AiUsageDto | null;
};

export function ModuleShell({
  title,
  icon,
  headerRight,
  sidebarSlot,
  sidebarWidth = 272,
  contentSlot,
  promptSlot,
  promptMaxWidth,
}: ModuleShellProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#ECECE8] bg-white px-[26px] py-4">
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-[16px] font-semibold tracking-[-0.01em] text-[#1B1B18]">
            {title}
          </div>
        </div>
        {headerRight}
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {sidebarSlot ? (
          <aside
            className="custom-scrollbar flex shrink-0 flex-col overflow-y-auto border-r border-[#ECECE8] bg-[#FBFBF9]"
            style={{ width: sidebarWidth }}
          >
            {sidebarSlot}
          </aside>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          {contentSlot}

          {promptSlot ? (
            <div className="shrink-0 border-t border-[#ECECE8] bg-white px-7 pb-[22px] pt-4">
              <div
                className="mx-auto w-full"
                style={promptMaxWidth ? { maxWidth: promptMaxWidth } : undefined}
              >
                {promptSlot}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
