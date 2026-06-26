"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type LandingOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: LandingOption[];
  label?: string;
  disabled?: boolean;
};

export default function LandingOptionPicker({ value, onChange, options, label, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full touch-manipulation items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-base text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selected?.label ?? "?"}</span>
        <ChevronDown size={16} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[2000] bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[2001] max-h-[min(70vh,520px)] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
            {label && (
              <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
              </div>
            )}
            <ul className="pb-6">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full touch-manipulation items-center justify-between px-4 py-3.5 text-left text-base ${
                      opt.value === value
                        ? "bg-accent-50 font-semibold text-accent-600"
                        : "text-slate-800 active:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <Check size={18} className="shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
