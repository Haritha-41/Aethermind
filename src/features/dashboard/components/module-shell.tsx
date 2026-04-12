import Link from "next/link";
import type { AiUsageDto } from "@/types/ai";
import type { ReactNode } from "react";

export type ModuleShellProps = {
  title: string;
  usage: AiUsageDto | null;
  sidebarSlot: ReactNode;
  contentSlot: ReactNode;
  promptSlot: ReactNode;
};

export function ModuleShell({ title, usage, sidebarSlot, contentSlot, promptSlot }: ModuleShellProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#18191e]">
      {/* Top Header */}
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#24262d] px-6 bg-[#18191e]">
        <h1 className="text-[15px] font-bold tracking-wide text-slate-100">{title}</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex h-8 items-center rounded-full border border-[#2d313a] bg-[#111215] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-[#14b8a6] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]/70"
            aria-label="Open admin panel"
            title="Open admin panel"
          >
            Admin Panel
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-full border border-[#2d313a] bg-[#111215] px-3 text-xs font-semibold text-slate-200 cursor-pointer hover:border-[#14b8a6] transition-colors" title="Generations remaining">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#14b8a6]">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {usage?.generation.remaining != null ? `${usage.generation.remaining} Gens` : "Unlimited"}
            </div>
            
            <div className="flex h-8 items-center gap-2 rounded-full border border-[#2d313a] bg-[#111215] px-3 text-xs font-semibold text-slate-200 cursor-pointer hover:border-[#14b8a6] transition-colors" title="Tokens used">
              <div className="h-2 w-2 rounded-full bg-[#14b8a6]" />
              {usage?.tokens.used ?? 0} {usage?.tokens.limit ? `/ ${usage.tokens.limit}` : ""}
            </div>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 bg-[#18191e]">
        {/* Left Control Panel */}
        <aside className="w-[320px] shrink-0 border-r border-[#24262d] bg-[#18191e] overflow-y-auto flex flex-col min-h-0">
          <div className="flex-1 min-h-0 p-6">
            {sidebarSlot}
          </div>
        </aside>

        {/* Right Canvas */}
        <main className="flex-1 flex flex-col bg-[#111215] relative overflow-hidden">
          {contentSlot}
          
          {/* Bottom Docked Prompt Box */}
          <div className="bg-[#18191e] border-t border-[#24262d] p-5 lg:p-6 shrink-0 relative z-10 w-full flex justify-center">
            <div className="w-full max-w-[960px]">
              {promptSlot}
            </div>
          </div>
        </main>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #2d313a;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
