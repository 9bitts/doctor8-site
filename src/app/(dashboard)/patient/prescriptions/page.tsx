"use client";

// src/app/(dashboard)/patient/prescriptions/page.tsx
// Patient prescriptions — PDF download, pharmacy network search and buy.

import { useState, useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithYear } from "@/lib/timezone";
import { getProfessionLabel } from "@/lib/professions";
import PatientEmissionAlertsPanel from "@/components/patient/PatientEmissionAlertsPanel";
import PatientPharmacySearchPanel from "@/components/patient/PatientPharmacySearchPanel";
import PatientPharmacyBuyPanel from "@/components/patient/PatientPharmacyBuyPanel";
import { downloadAuthenticatedPdf } from "@/lib/open-url-safely";
import {
  FileText, Download, Loader2, Pill, Calendar, AlertCircle, RefreshCw,
  ShieldCheck, Clock, XCircle, MessageCircle, Search, ShoppingBag,
} from "lucide-react";

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
  signatureStatus: string | null;
  signedAt: string | null;
  hasSignedPdf: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  whatsappNotifyStatus: string | null;
  doctor: { name: string; specialty: string };
}

export default function PatientPrescriptionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const userTz = useUserTimeZone();

  const [prescriptions, setPrescriptions] = useState<RxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeSearchMeds, setActiveSearchMeds] = useState<MedItem[]>([]);
  const [activeBuyPrescriptionId, setActiveBuyPrescriptionId] = useState<string | null>(null);
  const [searchPrescriptionId, setSearchPrescriptionId] = useState<string | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/patient/prescriptions", { credentials: "same-origin" });
      if (!res.ok) { setLoadError(true); return; }
      const d = await res.json();
      setPrescriptions(d.prescriptions || []);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }

  function fmt(date: string) {
    return formatShortDateWithYear(new Date(date), userTz, locale);
  }

  function canUsePharmacy(p: RxItem): boolean {
    return !p.isExpired && (p.signatureStatus === "SIGNED" || p.hasSignedPdf);
  }

  async function downloadPdf(prescriptionId: string) {
    setDownloadingId(prescriptionId);
    setDownloadError(null);
    try {
      await downloadAuthenticatedPdf(
        `/api/patient/prescriptions/${prescriptionId}/pdf`,
        `receita-${prescriptionId.slice(0, 8)}.pdf`,
      );
    } catch {
      setDownloadError(t("rx.pdfDownloadError"));
    } finally {
      setDownloadingId(null);
    }
  }

  function focusPharmacySearch(meds: MedItem[], prescriptionId: string) {
    setActiveSearchMeds(meds);
    setSearchPrescriptionId(prescriptionId);
    setActiveBuyPrescriptionId(null);
    document.getElementById("pharmacy-search-panel")?.scrollIntoView({ behavior: "smooth" });
  }

  function statusBadges(p: RxItem) {
    const badges: { key: string; cls: string; icon: ReactNode }[] = [];

    if (p.isExpired) {
      badges.push({ key: "expired", cls: "bg-rose-50 text-rose-700", icon: <XCircle size={11} /> });
    } else if (p.isExpiringSoon) {
      badges.push({ key: "expiring", cls: "bg-amber-50 text-amber-700", icon: <Clock size={11} /> });
    }

    if (p.signatureStatus === "SIGNED" || p.hasSignedPdf) {
      badges.push({ key: "signed", cls: "bg-emerald-50 text-emerald-700", icon: <ShieldCheck size={11} /> });
    } else if (p.signatureStatus === "PENDING") {
      badges.push({ key: "pending", cls: "bg-slate-100 text-slate-600", icon: <Clock size={11} /> });
    } else if (p.signatureStatus === "ERROR") {
      badges.push({ key: "signErr", cls: "bg-rose-50 text-rose-600", icon: <AlertCircle size={11} /> });
    } else if (p.signatureStatus === "CANCELLED") {
      badges.push({ key: "signCancel", cls: "bg-slate-100 text-slate-500", icon: <XCircle size={11} /> });
    }

    if (p.whatsappNotifyStatus === "SENT") {
      badges.push({ key: "waSent", cls: "bg-green-50 text-green-700", icon: <MessageCircle size={11} /> });
    } else if (p.whatsappNotifyStatus === "FAILED") {
      badges.push({ key: "waFail", cls: "bg-rose-50 text-rose-600", icon: <MessageCircle size={11} /> });
    }

    const labels: Record<string, string> = {
      expired: "myrx.expired",
      expiring: "myrx.expiringSoon",
      signed: "myrx.signed",
      pending: "myrx.pendingSign",
      signErr: "myrx.signError",
      signCancel: "myrx.signCancelled",
      waSent: "myrx.whatsappSent",
      waFail: "myrx.whatsappFailed",
    };

    return badges.map((b) => (
      <span key={b.key} className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${b.cls}`}>
        {b.icon} {t(labels[b.key])}
      </span>
    ));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("myrx.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("myrx.subtitle")}</p>
      </div>

      <PatientEmissionAlertsPanel />

      {downloadError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="shrink-0" />
          {downloadError}
        </div>
      )}

      <div id="pharmacy-search-panel">
        <PatientPharmacySearchPanel
          highlightMedications={activeSearchMeds.map((m) => ({ name: m.name, dosage: m.dosage }))}
          buyPrescriptionId={searchPrescriptionId}
        />
      </div>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-2xl border border-amber-200">
          <AlertCircle size={28} className="text-amber-500" />
          <p className="text-sm text-slate-600">{t("common.loadError")}</p>
          <button type="button" onClick={fetchData} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
            <RefreshCw size={14} /> {t("common.retry")}
          </button>
        </div>
      ) : loading ? (
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
            const pharmacyReady = canUsePharmacy(p);
            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${p.isExpired ? "border-rose-200 opacity-90" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      Dr. {p.doctor.name}
                      {p.doctor.specialty && (
                        <span className="text-slate-400 font-normal text-sm"> · {getProfessionLabel(lang, p.doctor.specialty)}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                      <Calendar size={12} />
                      {t("myrx.issued")} {fmt(p.createdAt)}
                      {p.validUntil && ` · ${t("myrx.validUntil")} ${fmt(p.validUntil)}`}
                      {p.signedAt && (
                        <span> · {t("myrx.signedAt").replace("{{date}}", fmt(p.signedAt))}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{statusBadges(p)}</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.map((m, i) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <Pill size={11} /> {m.name} {m.dosage}
                        </span>
                      ))}
                    </div>
                    {pharmacyReady && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        <button
                          type="button"
                          onClick={() => focusPharmacySearch(meds, p.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
                        >
                          <Search size={14} />
                          {t("myrx.searchPharmacies")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBuyPrescriptionId(
                              activeBuyPrescriptionId === p.id ? null : p.id,
                            );
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          <ShoppingBag size={14} />
                          {activeBuyPrescriptionId === p.id
                            ? t("myrx.hideBuy")
                            : t("myrx.buyNetwork")}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadPdf(p.id)}
                    disabled={downloadingId === p.id}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
                  >
                    {downloadingId === p.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {t("myrx.downloadPDF")}
                  </button>
                </div>
                {pharmacyReady && activeBuyPrescriptionId === p.id && (
                  <PatientPharmacyBuyPanel
                    prescriptionId={p.id}
                    medications={meds}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
