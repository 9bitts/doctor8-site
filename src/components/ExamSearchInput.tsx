"use client";

import { useState, useEffect, useRef } from "react";
import { FlaskConical, Loader2, Plus } from "lucide-react";

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
  noResults: string;
  onAdd: (exam: ExamSelection | { name: string }) => void;
}

export function formatExamItem(exam: { code?: string; name: string }): string {
  return exam.code ? `${exam.code} — ${exam.name}` : exam.name;
}

export function parseExamItemLine(line: string): { code?: string; name: string } {
  const m = line.match(/^(\d(?:\.\d+)+-\d)\s*[—–-]\s*(.+)$/);
  if (m) return { code: m[1], name: m[2].trim() };
  return { name: line.trim() };
}

export default function ExamSearchInput({
  placeholder,
  manualLabel,
  manualHint,
  noResults,
  onAdd,
}: ExamSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExamSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    if (!name) return;
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
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <FlaskConical size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
          className="rx-inp rx-inp-pl-10 rx-inp-pr-9"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="text-xs text-slate-400 px-3 py-3">{noResults}</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id || r.code}
                type="button"
                onClick={() => selectExam(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-brand-50 border-b border-slate-50 last:border-0"
              >
                <span className="text-[11px] font-bold text-brand-600">{r.code}</span>
                <p className="text-sm text-slate-700 mt-0.5 line-clamp-2">{r.name}</p>
                {r.groupName && (
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{r.groupName}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <button
        type="button"
        onClick={addManual}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-600 font-semibold text-sm transition"
      >
        <Plus size={16} /> {manualLabel}
      </button>
      <p className="text-xs text-slate-400 text-center mt-1">{manualHint}</p>
    </div>
  );
}
