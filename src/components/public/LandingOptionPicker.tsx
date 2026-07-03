"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatPickerOptionCount } from "@/lib/i18n/translations";

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
  emptyMessage?: string;
};

export default function LandingOptionPicker({
  value,
  onChange,
  options,
  label,
  disabled,
  searchable = false,
  searchPlaceholder,
  loading = false,
  emptyMessage,
}: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");
  const selected = options.find((o) => o.value === value);
  const searchPh = searchPlaceholder ?? t("pubSearch.searchSpecialty");

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

  useEffect(() => setMounted(true), []);

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

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  const sheet = open && mounted ? (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label ?? t("pubSearch.specialty")}
        className="relative z-10 flex w-full max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[75vh] sm:max-w-lg sm:rounded-2xl"
      >
        {/* Handle (mobile) */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            {label ?? t("pubSearch.specialty")}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {searchable && (
          <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={searchPh}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-accent-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/25"
                autoFocus
              />
            </div>
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {emptyMessage ?? t("pubSearch.noSpecialties")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => pick(opt.value)}
                      className={`flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-accent-50 text-accent-700"
                          : "text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug sm:text-base">
                          {opt.label}
                        </span>
                      </span>
                      {opt.meta && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {opt.meta}
                        </span>
                      )}
                      {active && (
                        <Check size={18} className="shrink-0 text-accent-600" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-400 sm:hidden">
            {formatPickerOptionCount(lang, filtered.length)}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className="flex w-full touch-manipulation items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-base text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{loading ? "…" : selected?.label ?? "—"}</span>
        <ChevronDown size={16} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {sheet && createPortal(sheet, document.body)}
    </>
  );
}
