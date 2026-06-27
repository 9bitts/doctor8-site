"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

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

export default function HumanitarianIntakesPanel({ slug = VENEZUELA_CAMPAIGN_SLUG }: { slug?: string }) {
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-slate-500" />
        <h2 className="font-bold text-slate-900">Fichas de triagem e anamnese</h2>
        <span className="text-xs text-slate-400 ml-auto">{intakes.length} registros</span>
      </div>

      {loading && intakes.length === 0 ? (
        <Loader2 size={20} className="animate-spin text-emerald-500" />
      ) : intakes.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma ficha ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[32rem] overflow-y-auto">
          {intakes.map((row) => {
            const open = expanded === row.id;
            const pri = row.computedPriority || "ROUTINE";
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
                    {row.triageFlags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Flags de triagem</p>
                        <p className="text-xs text-slate-700">{row.triageFlags.join(" ? ")}</p>
                      </div>
                    )}
                    {row.forceMedicalPool && (
                      <p className="text-xs text-amber-700 font-medium">Encaminhamento m?dico recomendado</p>
                    )}
                    {row.triageData != null && (
                      <DetailBlock title="Triagem r?pida" data={row.triageData} />
                    )}
                    {row.identificationData != null && (
                      <DetailBlock title="Identifica??o" data={row.identificationData} />
                    )}
                    {row.specialtyData != null && (
                      <DetailBlock title="Por especialidade" data={row.specialtyData} />
                    )}
                    {row.basicNeedsData != null && (
                      <DetailBlock title="Necessidades b?sicas" data={row.basicNeedsData} />
                    )}
                    {row.additionalNotes && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Observa??es</p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{row.additionalNotes}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Atualizado: {new Date(row.updatedAt).toLocaleString()}
                      {row.consentAt && ` ? Consentimento: ${new Date(row.consentAt).toLocaleString()}`}
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

function DetailBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
      <pre className="text-[11px] text-slate-700 bg-white border border-slate-100 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
