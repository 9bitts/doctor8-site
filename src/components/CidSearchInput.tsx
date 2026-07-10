"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

export interface CidSelection {
  code: string;
  description: string;
}

interface CidSearchInputProps {
  value: CidSelection | null;
  onChange: (v: CidSelection | null) => void;
  required?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const LABELS: Record<string, Record<string, string>> = {
  label: { pt: "CID (Classificação Internacional de Doenças)", en: "ICD code (International Classification of Diseases)", es: "CIE (Clasificación Internacional de Enfermedades)" },
  placeholder: { pt: "Buscar por código ou nome da doença…", en: "Search by code or disease name…", es: "Buscar por código o nombre de la enfermedad…" },
  hint: { pt: "O CID-10 é o padrão brasileiro para registrar diagnósticos no prontuário.", en: "ICD-10 is the standard for recording diagnoses in clinical records.", es: "La CIE-10 es el estándar para registrar diagnósticos en la historia clínica." },
  clear: { pt: "Remover", en: "Remove", es: "Quitar" },
  noResults: { pt: "Nenhum CID encontrado.", en: "No ICD codes found.", es: "No se encontraron códigos CIE." },
  searching: { pt: "Buscando…", en: "Searching…", es: "Buscando…" },
};

export default function CidSearchInput({ value, onChange, required, onOpenChange }: CidSearchInputProps) {
  const { t } = useI18n();
  const lang = t("common.cancel") === "Cancelar" ? "pt" : t("common.cancel") === "Cancel" ? "en" : "es";
  const lt = (key: string) => LABELS[key]?.[lang] ?? LABELS[key]?.en ?? key;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CidSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

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
      setFetchError("");
      setOpen(false);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setFetchError("");
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cid/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (seq !== requestSeq.current) return;
        if (!res.ok) {
          setResults([]);
          setFetchError(data.error || lt("noResults"));
          setOpen(true);
          return;
        }
        setResults(data.results || []);
        setOpen(true);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setFetchError(lt("noResults"));
        setOpen(true);
      }
      setLoading(false);
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (value) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-600">{value.code}</p>
            <p className="text-sm text-slate-700 mt-0.5">{value.description}</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(""); }}
            className="text-xs text-slate-500 hover:text-rose-500 shrink-0 inline-flex items-center gap-1"
          >
            <X size={12} /> {lt("clear")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative ${open ? "z-[100]" : ""}`}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {lt("label")}{required ? " *" : ""}
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          placeholder={lt("placeholder")}
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{lt("hint")}</p>

      {open && query.length >= 2 && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin shrink-0" />
              {lt("searching")}
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-3">{fetchError || lt("noResults")}</p>
          ) : (
            results.map((r) => (
              <button
                key={r.code}
                type="button"
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-brand-50 border-b border-slate-50 last:border-0"
              >
                <span className="text-xs font-bold text-brand-600">{r.code}</span>
                <p className="text-sm text-slate-700 mt-0.5 line-clamp-2">{r.description}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
