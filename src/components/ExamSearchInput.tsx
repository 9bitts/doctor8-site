"use client";

import { useState, useEffect, useRef } from "react";
import { FlaskConical, Loader2, Plus } from "lucide-react";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

export interface ExamSelection {
  id?: string;
  code: string;
  name: string;
  groupName?: string | null;
}

interface ExamSearchInputProps {
  placeholder: string;
  manualLabel: string;
  manualHint: string;
  emptyManualWarning: string;
  onAdd: (exam: ExamSelection | { name: string }) => void;
  onOpenChange?: (open: boolean) => void;
}

export function formatExamItem(exam: { code?: string; name: string }): string {
  return exam.code ? `${exam.code} — ${exam.name}` : exam.name;
}

export function parseExamItemLine(line: string): { code?: string; name: string } {
  const m = line.match(/^(\d(?:\.\d+)+-\d)\s*[—–-]\s*(.+)$/);
  if (m) return { code: m[1], name: m[2].trim() };
  return { name: line.trim() };
}

const searchInputClass =
  "w-full min-w-0 box-border rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40";

export default function ExamSearchInput({
  placeholder,
  manualLabel,
  manualHint,
  emptyManualWarning,
  onAdd,
  onOpenChange,
}: ExamSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExamSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/professional/exams/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setResults(data.exams || []);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function addManual() {
    const name = query.trim();
    if (!name) {
      setShowEmptyWarning(true);
      return;
    }
    setShowEmptyWarning(false);
    onAdd({ name });
    setQuery("");
    setOpen(false);
  }

  function selectExam(exam: ExamSelection) {
    onAdd(exam);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${open ? "z-[100]" : ""}`}>
      <div className="relative w-full">
        <FlaskConical
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (showEmptyWarning) setShowEmptyWarning(false);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results.length === 1) selectExam(results[0]);
              else addManual();
            }
          }}
          placeholder={placeholder}
          className={searchInputClass}
          aria-invalid={showEmptyWarning}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && query.length >= 2 && results.length > 0 && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id || r.code}
              type="button"
              onMouseDown={keepFocusOnPointerDown}
              onClick={() => selectExam(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-brand-50 border-b border-slate-50 last:border-0"
            >
              {r.code ? (
                <span className="text-[11px] font-bold text-brand-600">{r.code}</span>
              ) : null}
              <p className={`text-sm text-slate-700 line-clamp-2 ${r.code ? "mt-0.5" : ""}`}>{r.name}</p>
              {r.groupName && (
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{r.groupName}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addManual}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-600 font-semibold text-sm transition"
      >
        <Plus size={16} /> {manualLabel}
      </button>
      {showEmptyWarning ? (
        <p className="text-xs text-rose-600 text-center mt-1.5" role="alert">
          {emptyManualWarning}
        </p>
      ) : (
        <p className="text-xs text-slate-400 text-center mt-1">{manualHint}</p>
      )}
    </div>
  );
}
