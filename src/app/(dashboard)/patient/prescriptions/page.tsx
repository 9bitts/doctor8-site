"use client";

// src/app/(dashboard)/patient/prescriptions/page.tsx
// Patient's own prescriptions ("Minhas receitas"). Read-only list with PDF download.
// i18n via useI18n().

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";
import { FileText, Download, Loader2, Pill, Calendar } from "lucide-react";

interface MedItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

interface RxItem {
  id: string;
  createdAt: string;
  validUntil?: string;
  medications: MedItem[];
  instructions: string;
  doctor: { name: string; specialty: string };
}

export default function PatientPrescriptionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const [prescriptions, setPrescriptions] = useState<RxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/prescriptions");
      const d = await res.json();
      setPrescriptions(d.prescriptions || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function fmt(date: string) {
    return new Date(date).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("myrx.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("myrx.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t("myrx.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("myrx.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => {
            const meds = p.medications as MedItem[];
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      Dr. {p.doctor.name}
                      {p.doctor.specialty && <span className="text-slate-400 font-normal text-sm"> · {getProfessionLabel(lang, p.doctor.specialty)}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar size={12} />
                      {t("myrx.issued")} {fmt(p.createdAt)}
                      {p.validUntil && ` · ${t("myrx.validUntil")} ${fmt(p.validUntil)}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.map((m, i) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <Pill size={11} /> {m.name} {m.dosage}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`/api/professional/prescriptions/${p.id}/pdf`}
                    target="_blank"
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                  >
                    <Download size={14} /> {t("myrx.downloadPDF")}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
