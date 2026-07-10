"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

export type CategoryOption = {
  id: string;
  label: string;
};

function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

interface CategorySearchSelectProps {
  options: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
}

export default function CategorySearchSelect({
  options,
  value,
  onChange,
  disabled,
  label,
}: CategorySearchSelectProps) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = normText(query.trim());
    if (!q) return options;
    return options.filter((o) => normText(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (selected) setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [selected]);

  return (
    <div ref={wrapRef} className={`relative ${open ? "z-[100]" : ""}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : (selected?.label ?? query)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder={t("docs.modal.categorySearch")}
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white disabled:opacity-50"
        />
        {selected && !open ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        ) : null}
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-3">{t("docs.modal.categoryNoMatch")}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => {
                  onChange(o.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 border-b border-slate-50 last:border-0 ${
                  o.id === value ? "bg-brand-50/80 text-brand-700 font-medium" : "text-slate-700"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
