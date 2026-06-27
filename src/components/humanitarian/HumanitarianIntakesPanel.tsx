"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, FileText, Filter } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { buildIntakeSummary, hasVulnerabilityFlags } from "@/lib/humanitarian/intake-summary";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";

interface IntakeRow {
  id: string;
  patientLabel: string;
  status: string;
  computedPriority: string | null;
  triageFlags: string[];
  forceMedicalPool: boolean;
  triageCompletedAt: string | null;
  consentAt: string | null;
  serviceTypes: string[];
  triageData: unknown;
  identificationData: unknown;
  specialtyData: unknown;
  basicNeedsData: unknown;
  additionalNotes: string | null;
  updatedAt: string;
}

type FilterKey = "all" | "crisis_urgent" | "incomplete" | "vulnerable";

const STATUS_LABEL: Record<string, string> = {
  TRIAGE_ONLY: "S? triagem",
  PARTIAL: "Parcial",
  COMPLETE: "Completa",
};

const PRIORITY_COLOR: Record<string, string> = {
  CRISIS: "text-rose-600 bg-rose-50",
  URGENT: "text-amber-700 bg-amber-50",
  ROUTINE: "text-slate-600 bg-slate-100",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "crisis_urgent", label: "CRISIS / URGENT" },
  { key: "incomplete", label: "Ficha incompleta" },
  { key: "vulnerable", label: "Vulnerabilidade" },
];

function matchesFilter(row: IntakeRow, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "crisis_urgent") {
    return row.computedPriority === "CRISIS" || row.computedPriority === "URGENT";
  }
  if (filter === "incomplete") return row.status !== "COMPLETE";
  if (filter === "vulnerable") return hasVulnerabilityFlags(row.triageFlags);
  return true;
}

export default function HumanitarianIntakesPanel({ slug = VENEZUELA_CAMPAIGN_SLUG }: { slug?: string }) {
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/humanitarian/intakes?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (res.ok) setIntakes(data.intakes || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(
    () => intakes.filter((row) => matchesFilter(row, filter)),
    [intakes, filter],
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileText size={18} className="text-slate-500" />
        <h2 className="font-bold text-slate-900">Fichas de triagem e anamnese</h2>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length}{filter !== "all" ? ` / ${intakes.length}` : ""} registros
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              filter === f.key
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && intakes.length === 0 ? (
        <Loader2 size={20} className="animate-spin text-emerald-500" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {intakes.length === 0 ? "Nenhuma ficha ainda." : "Nenhum registro com este filtro."}
        </p>
      ) : (
        <div className="space-y-2 max-h-[32rem] overflow-y-auto">
          {filtered.map((row) => {
            const open = expanded === row.id;
            const pri = row.computedPriority || "ROUTINE";
            const summary = buildIntakeSummary(row as Parameters<typeof buildIntakeSummary>[0], "pt");

            return (
              <div key={row.id} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{row.patientLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {STATUS_LABEL[row.status] || row.status}
                      {row.serviceTypes.length > 0 && ` ? ${row.serviceTypes.join(", ")}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLOR[pri] || PRIORITY_COLOR.ROUTINE}`}>
                    {pri}
                  </span>
                  {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-50 bg-slate-50/50">
                    {row.forceMedicalPool && (
                      <p className="text-xs text-amber-700 font-medium pt-3">
                        Encaminhamento m?dico recomendado
                      </p>
                    )}
                    <HumanitarianIntakeSummary summary={summary} lang="pt" compact />
                    <p className="text-[10px] text-slate-400">
                      Atualizado: {new Date(row.updatedAt).toLocaleString("pt-BR")}
                      {row.consentAt && ` ? Consentimento: ${new Date(row.consentAt).toLocaleString("pt-BR")}`}
                      {row.triageCompletedAt && ` ? Triagem: ${new Date(row.triageCompletedAt).toLocaleString("pt-BR")}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
