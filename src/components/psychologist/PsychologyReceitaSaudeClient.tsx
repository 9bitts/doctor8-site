"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import { RECEITA_SAUDE_OFFICIAL_URL } from "@/lib/psychology-receita-saude";
import {
  ArrowLeft, Receipt, ExternalLink, Loader2, Download, User, Search,
} from "lucide-react";

interface Chart { id: string; firstName: string; lastName: string; cpf?: string | null; }

export default function PsychologyReceitaSaudeClient() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);

  const [checklist, setChecklist] = useState<string[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [selected, setSelected] = useState<Chart | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [cpf, setCpf] = useState("");
  const [amount, setAmount] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          fetch(`/api/professional/psychology/receita-saude?lang=${lang}`),
          fetch("/api/professional/records"),
        ]);
        const rData = await rRes.json();
        const cData = await cRes.json();
        setChecklist(rData.checklist || []);
        setCharts(cData.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [lang]);

  const filtered = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  async function downloadReceipt() {
    if (!selected || !cpf || !amount) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/professional/psychology/receita-saude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selected.id,
          patientCpf: cpf,
          amountBrl: amount,
          serviceDate,
          lang,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo-${serviceDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Receipt size={24} className="text-violet-600" />
          {t("psy.mod.receita.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.mod.receita.desc")}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
        {t("psy.receita.officialNote")}
        <a
          href={RECEITA_SAUDE_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 ml-2 font-semibold text-amber-800 underline"
        >
          Receita Saúde <ExternalLink size={14} />
        </a>
      </div>

      {!loading && checklist.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">{t("psy.receita.checklist")}</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            {checklist.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">{t("psy.receita.helperPdf")}</h2>
        {selected ? (
          <p className="text-sm font-medium">{selected.firstName} {selected.lastName}</p>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder={t("psy.sessions.searchPatient")}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelected(c); if (c.cpf) setCpf(c.cpf); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-violet-50 text-left text-sm"
                >
                  <User size={14} /> {c.firstName} {c.lastName}
                </button>
              ))}
            </div>
          </>
        )}
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="CPF do paciente"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("psy.receita.amount")}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={downloadReceipt}
          disabled={downloading || !selected || !cpf || !amount}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {t("psy.receita.download")}
        </button>
      </div>
    </div>
  );
}
