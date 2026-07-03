"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type LandingOption = { value: string; label: string; meta?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: LandingOption[];
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
};

export default function LandingOptionPicker({
  value,
  onChange,
  options,
  label,
  disabled,
  searchable = false,
  searchPlaceholder = "Search…",
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.meta?.toLowerCase().includes(q),
    );
  }, [options, filter]);

  useEffect(() => {
    if (!open) {
      setFilter("");
      return;
    }
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
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className="flex w-full touch-manipulation items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-base text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">
          {loading ? "…" : selected?.label ?? "—"}
        </span>
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
          <div className="fixed inset-x-0 bottom-0 z-[2001] flex max-h-[min(75vh,560px)] flex-col rounded-t-2xl bg-white shadow-2xl">
            {label && (
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
              </div>
            )}
            {searchable && (
              <div className="shrink-0 border-b border-slate-100 px-4 py-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-y-auto pb-6">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500">—</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`flex w-full touch-manipulation items-center justify-between gap-2 px-4 py-3.5 text-left ${
                        opt.value === value
                          ? "bg-accent-50 font-semibold text-accent-600"
                          : "text-slate-800 active:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-base">{opt.label}</span>
                        {opt.meta && (
                          <span className="block text-xs font-normal text-slate-400">{opt.meta}</span>
                        )}
                      </span>
                      {opt.value === value && <Check size={18} className="shrink-0" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
