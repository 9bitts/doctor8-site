import {
  Plus, FileText, Loader2, CheckCircle2, Search,
  PenLine, Pill, ArrowLeft, Copy,
  Clock, FlaskConical, ScrollText,
} from "lucide-react";
import { EmissionsSignModal, type SignTarget } from "@/components/professional/emissions/EmissionsSignModal";
import type { PrescriptionsPortalConfig } from "@/lib/prescriptions-portal-config";
import { ClinicalDocCard } from "./ClinicalDocCard";
import { PrescriptionCard } from "./PrescriptionCard";
import {
  isExamDocType,
  type ClinicalDocument,
  type ListFilter,
  type MedItem,
  type Prescription,
} from "./shared";

export type PrescriptionsHubProps = {
  t: (k: string) => string;
  locale: string;
  cfg: PrescriptionsPortalConfig;
  accountHref: string;
  loading: boolean;
  search: string;
  listFilter: ListFilter;
  showAllHistory: boolean;
  signProcessing: boolean;
  signResult: string | null;
  signConfig: { configured: boolean; provider: string; cpfMasked: string } | null;
  signTarget: SignTarget | null;
  filtered: Prescription[];
  filteredClinical: ClinicalDocument[];
  recentPrescriptions: Prescription[];
  recentClinical: ClinicalDocument[];
  showPrescriptionList: boolean;
  showClinicalList: boolean;
  onSearchChange: (value: string) => void;
  onListFilterChange: (filter: ListFilter) => void;
  onShowAllHistory: (value: boolean) => void;
  onOpenCreate: () => void;
  onOpenReceitaB?: () => void;
  onOpenReceitaControleEspecial?: () => void;
  onOpenExamCreate: () => void;
  onOpenDocumentCreate: () => void;
  onOpenReuse: (p: Prescription) => void;
  onOpenReuseClinical: (d: ClinicalDocument) => void;
  onSignPrescription: (p: Prescription) => void;
  onSignClinicalDoc: (d: ClinicalDocument) => void;
  onPdfError: (msg: string) => void;
  onRefreshPrescriptions: () => void;
  onRefreshAll: () => void;
  onCloseSignModal: () => void;
  sncrStatus?: {
    enabled: boolean;
    authenticated: boolean;
    platformCnpjConfigured: boolean;
    cpfConfigured: boolean;
    pool: { NRB: number; RCE: number };
    loginPath: string;
  } | null;
  onSncrLogin?: () => void;
};

export function PrescriptionsHub({
  t,
  locale,
  cfg,
  accountHref,
  loading,
  search,
  listFilter,
  showAllHistory,
  signProcessing,
  signResult,
  signConfig,
  signTarget,
  filtered,
  filteredClinical,
  recentPrescriptions,
  recentClinical,
  showPrescriptionList,
  showClinicalList,
  onSearchChange,
  onListFilterChange,
  onShowAllHistory,
  onOpenCreate,
  onOpenReceitaB,
  onOpenReceitaControleEspecial,
  onOpenExamCreate,
  onOpenDocumentCreate,
  onOpenReuse,
  onOpenReuseClinical,
  onSignPrescription,
  onSignClinicalDoc,
  onPdfError,
  onRefreshPrescriptions,
  onRefreshAll,
  onCloseSignModal,
  sncrStatus = null,
  onSncrLogin,
}: PrescriptionsHubProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onOpenCreate}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-brand-500/20">
            <Plus size={16} /> {t("rx.new")}
          </button>
          {!cfg.phytoOnly && onOpenReceitaB && onOpenReceitaControleEspecial && (
            <>
              <button onClick={onOpenReceitaB}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-blue-600/20">
                <Plus size={16} /> {t("rx.newReceitaB")}
              </button>
              <button onClick={onOpenReceitaControleEspecial}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-red-600/20">
                <Plus size={16} /> {t("rx.newReceitaC")}
              </button>
            </>
          )}
        </div>
      </div>

      {sncrStatus?.enabled && !sncrStatus.authenticated && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-blue-900">{t("rx.sncrStatusBanner")}</p>
          {onSncrLogin && (
            <button
              type="button"
              onClick={onSncrLogin}
              className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {t("rx.sncrConnectGovbr")}
            </button>
          )}
        </div>
      )}

      {sncrStatus?.enabled && sncrStatus.authenticated && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
          {t("rx.sncrPoolBalance")
            .replace("{{nrb}}", String(sncrStatus.pool.NRB))
            .replace("{{rce}}", String(sncrStatus.pool.RCE))}
        </div>
      )}

      {signProcessing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">{t("rx.signProcessing")}</p>
        </div>
      )}

      {signResult === "success" && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-700 font-medium">{t("rx.signSuccess")}</p>
        </div>
      )}
      {signResult === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">{t("rx.signCancelled")}</div>
      )}
      {signResult === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{t("rx.signError")}</div>
      )}

      {signConfig && !signConfig.configured && !cfg.skipDigitalSign && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
          <PenLine size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-700">{t("digSign.bannerTitle")}</p>
            <p className="text-xs text-brand-500 mt-1">{t("digSign.bannerDesc")}</p>
          </div>
          <a href={accountHref}
            className="text-xs font-semibold text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition shrink-0">
            {t("digSign.configure")}
          </a>
        </div>
      )}

      <div className={`grid grid-cols-1 ${cfg.prescriptionsOnly ? "" : "sm:grid-cols-3"} gap-3`}>
        <button onClick={onOpenCreate}
          className="text-left p-4 rounded-2xl border border-accent-100 bg-gradient-to-br from-brand-50 to-accent-50/40 hover:border-accent-200 transition">
          <Pill size={20} className="text-accent-500 mb-2" />
          <p className="font-semibold text-brand-900 text-sm">{t("rx.createAction")}</p>
          <p className="text-xs text-brand-500/80 mt-0.5">{cfg.phytoOnly ? t("rx.addPhytotherapy") : t("rx.createActionDesc")}</p>
        </button>
        {!cfg.prescriptionsOnly && (
          <>
        <button onClick={onOpenExamCreate}
          className="text-left p-4 rounded-2xl border border-brand-100 bg-white hover:bg-brand-50/40 transition">
          <FlaskConical size={20} className="text-brand-500 mb-2" />
          <p className="font-semibold text-slate-800 text-sm">{t("rx.examAction")}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("rx.examActionDesc")}</p>
        </button>
        <button onClick={onOpenDocumentCreate}
          className="text-left p-4 rounded-2xl border border-brand-100 bg-white hover:bg-brand-50/40 transition">
          <ScrollText size={20} className="text-brand-500 mb-2" />
          <p className="font-semibold text-slate-800 text-sm">{t("rx.documentAction")}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("rx.documentActionDesc")}</p>
        </button>
          </>
        )}
      </div>

      {!cfg.prescriptionsOnly && (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "prescription", "exam", "document"] as ListFilter[]).map((f) => (
          <button key={f} onClick={() => { onListFilterChange(f); onShowAllHistory(true); }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition ${
              listFilter === f ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {t(f === "all" ? "rx.filterAll" : f === "prescription" ? "rx.filterPrescription" : f === "exam" ? "rx.filterExam" : "rx.filterDocument")}
          </button>
        ))}
      </div>
      )}

      {!loading && !showAllHistory && (recentPrescriptions.length > 0 || recentClinical.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">{t("rx.recent")}</h2>
            <button onClick={() => onShowAllHistory(true)} className="text-xs font-semibold text-brand-500 hover:text-brand-700">
              {t("rx.showAll")}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {recentPrescriptions.map((p) => {
              const meds = p.medications as MedItem[];
              const patientName = p.document?.patient
                ? `${p.document.patient.firstName} ${p.document.patient.lastName}` : t("rx.patient");
              return (
                <div key={`rx-${p.id}`} onClick={() => onOpenReuse(p)}
                  className="snap-start shrink-0 w-64 bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-200 transition cursor-pointer">
                  <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{t("rx.kindPrescription")}</span>
                  <p className="text-xs text-slate-400 mt-2">{new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-1 truncate">{patientName}</p>
                  <ol className="mt-2 space-y-0.5">
                    {meds.slice(0, 2).map((m, i) => (
                      <li key={i} className="text-xs text-slate-500 truncate">{i + 1}. {m.name}</li>
                    ))}
                  </ol>
                  <button onClick={(e) => { e.stopPropagation(); onOpenReuse(p); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-brand-500 bg-brand-50 py-1.5 rounded-lg">
                    <Copy size={12} /> {t("rx.reuse")}
                  </button>
                </div>
              );
            })}
            {recentClinical.map((d) => {
              const patientName = d.document?.patient
                ? `${d.document.patient.firstName} ${d.document.patient.lastName}` : t("rx.patient");
              return (
                <div key={`doc-${d.id}`} onClick={() => onOpenReuseClinical(d)}
                  className="snap-start shrink-0 w-64 bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-200 transition cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {isExamDocType(d.type) ? t("rx.kindExam") : t("rx.kindDocument")}
                  </span>
                  <p className="text-xs text-slate-400 mt-2">{new Date(d.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-1 truncate">{d.title}</p>
                  <p className="text-xs text-slate-500 truncate">{patientName}</p>
                  <button onClick={(e) => { e.stopPropagation(); onOpenReuseClinical(d); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-brand-500 bg-brand-50 py-1.5 rounded-lg">
                    <Copy size={12} /> {t("rx.reuse")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(showAllHistory || (recentPrescriptions.length === 0 && recentClinical.length === 0)) && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("rx.search")} value={search} onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {showAllHistory && (
            <button onClick={() => onShowAllHistory(false)} className="text-xs text-slate-500 hover:text-brand-500 flex items-center gap-1">
              <ArrowLeft size={12} /> {t("rx.recent")}
            </button>
          )}
        </>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-400" /></div>
      ) : filtered.length === 0 && filteredClinical.length === 0 && !showAllHistory ? null
      : (showAllHistory || search.trim().length > 0) ? (
        <div className="space-y-3">
          {showPrescriptionList && filtered.map((p) => (
            <PrescriptionCard
              key={p.id} p={p} locale={locale} t={t}
              onReuse={() => onOpenReuse(p)}
              onSign={() => onSignPrescription(p)}
              onPdfError={onPdfError}
              onRefresh={onRefreshPrescriptions}
              apiBase={cfg.apiBase}
              hideSign={cfg.skipDigitalSign}
            />
          ))}
          {showClinicalList && filteredClinical.map((d) => (
            <ClinicalDocCard
              key={d.id} d={d} locale={locale} t={t}
              onReuse={() => onOpenReuseClinical(d)}
              onSign={() => onSignClinicalDoc(d)}
              onPdfError={onPdfError}
              onRefresh={onRefreshAll}
            />
          ))}
          {showPrescriptionList && showClinicalList && filtered.length === 0 && filteredClinical.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <FileText size={40} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t("rx.empty")}</p>
            </div>
          )}
        </div>
      ) : null}

      {signTarget && !cfg.skipDigitalSign && (
        <EmissionsSignModal target={signTarget} signConfig={signConfig} deliverAfter onClose={onCloseSignModal} />
      )}
    </div>
  );
}
