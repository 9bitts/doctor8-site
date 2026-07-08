"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, Loader2, Stethoscope } from "lucide-react";

type CompanyCard = {
  companyId: string;
  nomeFantasia: string;
  cnpj: string;
  highRiskCount: number;
  pcmsoCompletionPercent: number;
  coordinatorName: string | null;
};

export default function MedicoPainelPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [totalHighRisks, setTotalHighRisks] = useState(0);

  useEffect(() => {
    fetch("/api/occupational-physician/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setCompanies(data.companies ?? []);
        setTotalHighRisks(data.summary?.totalHighRisks ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Portal médico do trabalho</h1>
        <p className="text-slate-500 text-sm mt-1">
          Empresas vinculadas — alertas de risco psicossocial e status PCMSO (sem acesso a EAP ou denúncias).
        </p>
      </div>

      {totalHighRisks > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-medium text-amber-900">
              {totalHighRisks} risco(s) alto/crítico no total
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Revise o inventário psicossocial e a integração com o PCMSO em cada empresa.
            </p>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          Nenhuma empresa vinculada. Aguarde o convite do RH/SST da empresa.
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map((c) => (
            <Link
              key={c.companyId}
              href={`/empresas/medico/empresas/${c.companyId}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300 hover:shadow-sm transition flex items-start gap-4"
            >
              <div className="p-2 rounded-xl bg-teal-50">
                <Building2 className="text-teal-700" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900">{c.nomeFantasia}</h2>
                <p className="text-xs text-slate-500 mt-0.5">CNPJ {c.cnpj}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${c.highRiskCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    <AlertTriangle size={12} />
                    {c.highRiskCount} risco(s) alto
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-800">
                    <Stethoscope size={12} />
                    PCMSO {c.pcmsoCompletionPercent}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
