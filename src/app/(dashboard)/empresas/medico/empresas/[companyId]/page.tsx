"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Stethoscope } from "lucide-react";

type Risk = {
  id: string;
  hazardCode: string;
  hazardLabel: string;
  riskLevel: string;
  severity: number;
  probability: number;
  possibleHarm: string | null;
  existingControls: string | null;
};

export default function MedicoEmpresaDetailPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    company: { nomeFantasia: string; cnpj: string; nr1ComplianceScore: number | null };
    pcmso: {
      coordinatorName: string | null;
      completionPercent: number;
      checklist: { id: string; label: string; done: boolean }[];
      notes: string | null;
    } | null;
    highRisks: Risk[];
    openActionItems: number;
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/occupational-physician/companies/${companyId}`)
      .then((r) => r.json())
      .then((json) => { if (json.company) setData(json); })
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500">
        Empresa não encontrada ou sem permissão.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <Link href="/empresas/medico/painel" className="inline-flex items-center gap-2 text-teal-700 text-sm hover:underline">
        <ArrowLeft size={16} /> Voltar ao painel
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{data.company.nomeFantasia}</h1>
        <p className="text-slate-500 text-sm">CNPJ {data.company.cnpj}</p>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 flex items-center gap-3">
        <Stethoscope className="text-teal-700" size={24} />
        <div>
          <p className="font-medium text-teal-900">
            PCMSO: {data.pcmso?.completionPercent ?? 0}% · {data.openActionItems} ação(ões) em aberto
          </p>
          <p className="text-xs text-teal-800">
            Coordenador: {data.pcmso?.coordinatorName ?? "—"}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={18} />
          Riscos psicossociais alto/crítico
        </h2>
        {data.highRisks.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum risco alto ou crítico registrado.</p>
        ) : (
          <ul className="space-y-3">
            {data.highRisks.map((r) => (
              <li key={r.id} className="border border-slate-100 rounded-xl p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.hazardLabel}</span>
                  <span className="text-xs uppercase text-amber-700 font-semibold">{r.riskLevel}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{r.hazardCode} · S{r.severity} × P{r.probability}</p>
                {r.possibleHarm && (
                  <p className="text-slate-600 mt-2"><span className="text-slate-400">Dano possível:</span> {r.possibleHarm}</p>
                )}
                {r.existingControls && (
                  <p className="text-slate-600 mt-1"><span className="text-slate-400">Controles:</span> {r.existingControls}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.pcmso?.checklist && data.pcmso.checklist.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Checklist integração PGR ↔ PCMSO</h2>
          {data.pcmso.checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
              <span className={item.done ? "text-teal-600" : "text-slate-300"}>{item.done ? "✓" : "○"}</span>
              {item.label}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
