"use client";

import { useState, useEffect } from "react";
import { Loader2, Download, FileSpreadsheet } from "lucide-react";

function fmt(c: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(c / 100);
}

export default function OrganizationAccountingPage() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dre, setDre] = useState<{
    currency: string;
    receitaConsultas: number;
    receitaConvenios: number;
    receitaOutras: number;
    receitaTotal: number;
    despesasOperacionais: number;
    folhaPagamento: number;
    despesasTotal: number;
    resultado: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/organization/accounting?month=${month}`);
      const data = await res.json();
      if (res.ok) setDre(data.dre);
      setLoading(false);
    }
    load();
  }, [month]);

  function exportCsv() {
    window.open(`/api/organization/accounting?month=${month}&format=csv`, "_blank");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-indigo-600" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contabilidade</h1>
            <p className="text-slate-500 text-sm">DRE e exportacao para o contador</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
          <button onClick={exportCsv} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {loading || !dre ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b">
            <p className="font-semibold text-slate-800">DRE - {month}</p>
          </div>
          <div className="divide-y">
            {[
              { label: "Receita consultas (particular)", value: dre.receitaConsultas, positive: true },
              { label: "Receita convenios (TISS pago)", value: dre.receitaConvenios, positive: true },
              { label: "Outras receitas", value: dre.receitaOutras, positive: true },
              { label: "Receita total", value: dre.receitaTotal, bold: true, positive: true },
              { label: "Despesas operacionais", value: dre.despesasOperacionais, positive: false },
              { label: "Folha de pagamento", value: dre.folhaPagamento, positive: false },
              { label: "Despesas total", value: dre.despesasTotal, bold: true, positive: false },
              { label: "Resultado do periodo", value: dre.resultado, bold: true, positive: dre.resultado >= 0 },
            ].map((row) => (
              <div key={row.label} className={`px-6 py-3 flex justify-between ${row.bold ? "bg-slate-50 font-semibold" : ""}`}>
                <span className="text-sm text-slate-700">{row.label}</span>
                <span className={`text-sm ${row.positive ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(row.value, dre.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Portal do contador: exporte o CSV mensal com lancamentos, folha e guias TISS pagas.
      </p>
    </div>
  );
}
