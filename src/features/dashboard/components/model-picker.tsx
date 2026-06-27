"use client";

import { useEffect, useRef, useState } from "react";

export type ModelOption = {
  value: string;
  name: string;
  provider?: string;
  tag?: string;
  /** brand dot color */
  dot?: string;
};

type ModelPickerProps = {
  options: readonly ModelOption[];
  value: string;
  onChange: (value: string) => void;
};

export function ModelPicker({ options, value, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex items-center gap-[9px] rounded-[11px] border border-[#ECECE8] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(20,20,18,0.03)]"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: current?.dot ?? "#0E9F77" }}
        />
        <span className="text-[13px] font-semibold text-[#1B1B18]">
          {current?.name ?? "Model"}
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="anim-pop absolute right-0 top-[calc(100%+8px)] z-[60] w-[308px] rounded-2xl border border-[#ECECE8] bg-white p-2 shadow-[0_24px_60px_-18px_rgba(20,20,18,0.28)]">
          <div className="px-[10px] pb-[6px] pt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#A6A69E]">
            Choose a model
          </div>
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-[11px] rounded-[11px] p-[10px] text-left transition-colors hover:bg-[#F6F6F3] ${
                  isActive ? "bg-[#F1F7F4]" : "bg-transparent"
                }`}
              >
                <span
                  className="h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{ background: option.dot ?? "#0E9F77" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#1B1B18]">
                    {option.name}
                  </span>
                  {option.provider ? (
                    <span className="block text-[11.5px] text-[#9A9A92]">{option.provider}</span>
                  ) : null}
                </span>
                {option.tag ? (
                  <span className="shrink-0 rounded-md bg-[#E7F4EF] px-2 py-[3px] text-[11px] font-semibold text-[#0E9F77]">
                    {option.tag}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div className="mt-[6px] flex items-center gap-[7px] border-t border-[#F1F1ED] p-[10px] text-[12px] text-[#9A9A92]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Pro covers every model.
          </div>
        </div>
      ) : null}
    </div>
  );
}
