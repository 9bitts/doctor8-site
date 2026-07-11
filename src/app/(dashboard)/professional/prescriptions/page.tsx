"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// Memed-style prescription UI: reuse, manual add, recent carousel.

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { useToast } from "@/components/ui/toast";
import {
  Plus, FileText, Download, Loader2, CheckCircle2, Search,
  ChevronRight, AlertTriangle, PenLine, Pill, ArrowLeft, Copy,
  Clock, User, FlaskConical, ScrollText, LayoutTemplate, BookmarkPlus, Sparkles, X,
} from "lucide-react";
import { PatientNoAccountPanel } from "@/components/professional/emissions/PatientNoAccountPanel";
import { EmissionsSignModal, RX_STYLES, type SignTarget, type EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import { EmissionPostSaveFlow, type SavedEmission } from "@/components/professional/emissions/EmissionPostSaveFlow";
import { EmissionCardActions } from "@/components/professional/emissions/EmissionCardActions";
import { ExamCreateView } from "@/components/professional/emissions/ExamCreateView";
import { DocumentCreateView } from "@/components/professional/emissions/DocumentCreateView";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { readChartDeepLink } from "@/lib/video-chart-nav";
import {
  isExamTemplateCategory,
  parseExamTemplateBody,
  TEMPLATE_CATEGORIES,
} from "@/lib/clinical-template-utils";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import type { Chart } from "@/components/professional/emissions/types";
import { DRUG_COUNTRIES, type DrugCountryCode } from "@/lib/drug-countries";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import DrugSearchResults, { type DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import PrescriptionMedItemForm, { type PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import { isFreeTextPrescriptionItem } from "@/lib/prescription-item-kind";
import { phytotherapyProductByValue } from "@/lib/pics/reference-library/phytotherapy-products";
import { floralProductByValue } from "@/lib/pics/reference-library/floral-products";
import {
  resolveFloralStarter,
  templateHasFloralItems,
} from "@/lib/pics/reference-library/floral-starter-templates";
import {
  getPrescriptionsPortalConfig,
  apiPath,
  type PrescriptionsPortalId,
} from "@/lib/prescriptions-portal-config";
import { consumeVoicePrefill } from "@/lib/voice-assistant/prefill-storage";
import { VOICE_PRESCRIPTION_PREFILL_EVENT } from "@/lib/voice-assistant/types";
import {
  extendSessionForWrite,
  isAuthFailureStatus,
  redirectToLoginAfterAuthFailure,
} from "@/lib/session-extend-client";

type ImportablePatient = {
  patientProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: true;
  source: "appointment" | "shared" | "email";
};

type PlatformMatch = {
  patientProfileId: string;
  patientUserId: string;
  displayName: string;
  city: string | null;
  hasLink: boolean;
  linkStatus: "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED";
};

type PlatformRxTarget = {
  patientUserId: string;
  patientProfileId: string;
  displayName: string;
  linkStatus: PlatformMatch["linkStatus"];
};

function controlInfo(type: string | null | undefined): {
  tarja: "preta" | "vermelha"; label: string; receita: string;
} | null {
  if (!type) return null;
  const code = type.toUpperCase();
  const A = "Exige Notificação de Receita A (amarela)";
  const B = "Exige Notificação de Receita B (azul)";
  const C = "Exige Receita de Controle Especial (2 vias)";
  const CESP = "Exige Notificação de Receita Especial";
  const map: Record<string, { tarja: "preta" | "vermelha"; label: string; receita: string }> = {
    A1: { tarja: "preta", label: "A1 — Receita A", receita: A },
    A2: { tarja: "preta", label: "A2 — Receita A", receita: A },
    A3: { tarja: "preta", label: "A3 — Receita A", receita: A },
    B1: { tarja: "preta", label: "B1 — Receita B", receita: B },
    B2: { tarja: "preta", label: "B2 — Receita B", receita: B },
    C1: { tarja: "vermelha", label: "C1 — Controle especial", receita: C },
    C2: { tarja: "vermelha", label: "C2 — Retinoide", receita: CESP },
    C3: { tarja: "vermelha", label: "C3 — Talidomida", receita: CESP },
    C4: { tarja: "vermelha", label: "C4 — Antirretroviral", receita: C },
    C5: { tarja: "vermelha", label: "C5 — Anabolizante", receita: C },
  };
  return map[code] || { tarja: "vermelha", label: "Controlado", receita: C };
}

function missingLabel(code: string): string {
  return ({ name: "nome completo", address: "endereço", dob: "data de nascimento" } as Record<string, string>)[code] || code;
}

interface ClinicalDocument {
  id: string; type: string; title: string; createdAt: string;
  content?: string | null; examItems?: string[]; examNotes?: string; cid?: string;
  patientRecordId?: string | null;
  signatureStatus?: string | null; digitalSignature?: string | null; signed?: boolean;
  whatsappNotifyStatus?: string | null;
  patientNotifiedAt?: boolean;
  categoryName?: string | null;
  document?: { patient?: { firstName: string; lastName: string } | null };
}

type View = "hub" | "prescription" | "exam" | "document";
type ListFilter = "all" | "prescription" | "exam" | "document";

interface MedItem extends PrescriptionMedItem {}

function medItemFieldErrors(m: MedItem): { name: boolean; dosage: boolean; frequency: boolean } {
  const kind = m.itemKind || "medication";
  return {
    name: !m.name.trim(),
    dosage: kind === "medication" && !m.dosage?.trim(),
    frequency: kind === "medication" && !m.frequency?.trim(),
  };
}

function isMedItemValid(m: MedItem): boolean {
  const errors = medItemFieldErrors(m);
  return !errors.name && !errors.dosage && !errors.frequency;
}

function isMedsFormValid(medications: MedItem[]): boolean {
  return medications.length > 0 && medications.every(isMedItemValid);
}

function parseBulkMedicationLines(
  text: string,
  defaultKind: MedItem["itemKind"] = "medication",
): MedItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (isFreeTextPrescriptionItem(defaultKind)) {
        return {
          name: line,
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          itemKind: defaultKind,
        };
      }
      const parts = line.split(/\t|;\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
      return {
        name: parts[0] || line,
        dosage: parts[1] || "",
        frequency: parts[2] || "",
        duration: parts[3] || "",
        instructions: parts[4] || "",
        itemKind: defaultKind,
      };
    });
}

function rxFieldClass(invalid: boolean): string {
  return invalid ? " !border-rose-400 !bg-rose-50" : "";
}
interface Prescription {
  id: string; createdAt: string; validUntil?: string;
  instructions?: string; patientRecordId?: string | null;
  digitalSignature?: string | null;
  signatureStatus?: string | null;
  whatsappNotifyStatus?: string | null;
  patientNotifiedAt?: boolean;
  document?: { patient?: { firstName: string; lastName: string } | null };
  medications: MedItem[];
}

interface RxTemplate {
  id: string;
  name: string;
  medications: MedItem[];
  instructions: string;
  validDays: number;
}

function isExamDocType(type: string) {
  return type === "EXAM_REQUEST" || type === "EXAM_RESULT";
}

function emissionKindFromDoc(type: string): EmissionKind {
  return isExamDocType(type) ? "exam" : "document";
}

function PrescriptionCard({
  p, locale, t, onReuse, onSign, onPdfError, onRefresh, apiBase, hideSign,
}: {
  p: Prescription; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void; onPdfError: (message: string) => void;
  onRefresh: () => void; apiBase: string; hideSign?: boolean;
}) {
  const meds = p.medications as MedItem[];
  const signed = p.signatureStatus === "SIGNED";
  const pending = p.signatureStatus === "PENDING";
  const patientName = p.document?.patient
    ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
    : t("rx.patient");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-brand-200 transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{patientName}</p>
            {signed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> {t("rx.signed")}
              </span>
            )}
            {pending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock size={11} /> {t("rx.signPending")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t("rx.issued")} {new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
            {p.validUntil && ` · ${t("rx.validUntil")} ${new Date(p.validUntil).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}`}
          </p>
          <ol className="mt-3 space-y-1">
            {meds.slice(0, 4).map((m, i) => (
              <li key={i} className="text-xs text-slate-600 truncate">
                {i + 1}. {m.name}{m.dosage ? ` — ${m.dosage}` : ""}
              </li>
            ))}
            {meds.length > 4 && <li className="text-xs text-slate-400">+{meds.length - 4} {t("rx.more")}</li>}
          </ol>
        </div>
      </div>
      <EmissionCardActions
        kind="prescription"
        emissionId={p.id}
        signatureStatus={p.signatureStatus}
        patientNotifiedAt={p.patientNotifiedAt}
        whatsappNotifyStatus={p.whatsappNotifyStatus}
        patientName={patientName}
        medications={meds}
        t={t}
        onReuse={onReuse}
        onSign={hideSign ? undefined : onSign}
        onPdfError={onPdfError}
        onDelivered={onRefresh}
        apiBase={apiBase}
        hideSign={hideSign}
      />
    </div>
  );
}

function ClinicalDocCard({
  d, locale, t, onReuse, onSign, onPdfError, onRefresh,
}: {
  d: ClinicalDocument; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void; onPdfError: (message: string) => void;
  onRefresh: () => void;
}) {
  const signed = d.signatureStatus === "SIGNED";
  const pending = d.signatureStatus === "PENDING";
  const patientName = d.document?.patient
    ? `${d.document.patient.firstName} ${d.document.patient.lastName}`
    : t("rx.patient");
  const kindLabel = isExamDocType(d.type) ? t("rx.kindExam") : t("rx.kindDocument");
  const kind = emissionKindFromDoc(d.type);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-brand-200 transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{kindLabel}</span>
            <p className="font-semibold text-slate-800 truncate">{d.title}</p>
            {signed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> {t("rx.signed")}
              </span>
            )}
            {pending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock size={11} /> {t("rx.signPending")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{patientName}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(d.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
          {isExamDocType(d.type) && d.examItems && d.examItems.length > 0 && (
            <ol className="mt-2 space-y-0.5">
              {d.examItems.slice(0, 3).map((item, i) => (
                <li key={i} className="text-xs text-slate-600 truncate">{i + 1}. {item}</li>
              ))}
            </ol>
          )}
          {!isExamDocType(d.type) && d.content && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{d.content}</p>
          )}
        </div>
      </div>
      <EmissionCardActions
        kind={kind}
        emissionId={d.id}
        signatureStatus={d.signatureStatus}
        patientNotifiedAt={d.patientNotifiedAt}
        whatsappNotifyStatus={d.whatsappNotifyStatus}
        patientName={patientName}
        examItems={d.examItems}
        title={d.title}
        content={d.content}
        t={t}
        onReuse={onReuse}
        onSign={onSign}
        onPdfError={onPdfError}
        onDelivered={onRefresh}
      />
    </div>
  );
}

export default function PrescriptionsPage() {
  const { t, lang } = useI18n();
  const { update: updateSession } = useSession();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portal: PrescriptionsPortalId = pathname.startsWith("/integrative-therapist")
    ? "integrative-therapist"
    : "professional";
  const cfg = getPrescriptionsPortalConfig(portal);
  const api = (suffix: string) => apiPath(cfg, suffix);
  const accountHref = mapProfessionalPathToPortal(pathname, cfg.accountSignHref);
  const locale = localeOf(lang);

  const [view, setView] = useState<View>("hub");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [clinicalDocs, setClinicalDocs] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [reuseClinical, setReuseClinical] = useState<ClinicalDocument | null>(null);
  const [reusePatient, setReusePatient] = useState<Chart | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [reuseSource, setReuseSource] = useState<Prescription | null>(null);

  const [savedEmission, setSavedEmission] = useState<SavedEmission | null>(null);
  const [postSaveStep, setPostSaveStep] = useState<"review" | "choose" | "deliver" | "success">("choose");
  const [postSaveShareUrl, setPostSaveShareUrl] = useState("");

  const [charts, setCharts] = useState<Chart[]>([]);
  const [importablePatients, setImportablePatients] = useState<ImportablePatient[]>([]);
  const [platformMatches, setPlatformMatches] = useState<PlatformMatch[]>([]);
  const [platformTarget, setPlatformTarget] = useState<PlatformRxTarget | null>(null);
  const [requestingLinkId, setRequestingLinkId] = useState<string | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [importingPatientId, setImportingPatientId] = useState<string | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const patientSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugSearchDone, setDrugSearchDone] = useState(false);
  const [drugSearchModalOpen, setDrugSearchModalOpen] = useState(false);
  const [drugCountry, setDrugCountry] = useState<DrugCountryCode>("BR");

  const [medications, setMedications] = useState<MedItem[]>([]);
  const [highlightIncompleteMeds, setHighlightIncompleteMeds] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  const [signConfig, setSignConfig] = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signProcessing, setSignProcessing] = useState(false);

  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lockPatient, setLockPatient] = useState(false);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);
  const [pendingStarterId, setPendingStarterId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingDocTemplateId, setPendingDocTemplateId] = useState<string | null>(null);
  const [examTemplatePrefill, setExamTemplatePrefill] = useState<{
    items: string[];
    notes: string;
    cid: string;
    title: string;
  } | null>(null);
  const [docTemplatePrefill, setDocTemplatePrefill] = useState<{
    body: string;
    templateId: string;
  } | null>(null);
  const [templateAppliedHint, setTemplateAppliedHint] = useState(false);
  const [pendingFloralProductId, setPendingFloralProductId] = useState<string | null>(null);
  const [floralOnlyMode, setFloralOnlyMode] = useState(false);
  const [voicePrefillActive, setVoicePrefillActive] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  useEffect(() => {
    if (cfg.prescriptionsOnly && (view === "exam" || view === "document")) {
      setView("hub");
    }
  }, [cfg.prescriptionsOnly, view]);

  const applyVoicePrefill = useCallback(async () => {
    const payload = consumeVoicePrefill();
    if (!payload || payload.type !== "prescription") return;

    const { prefill } = payload;
    setView("prescription");
    setVoicePrefillActive(true);

    if (prefill.medications.length > 0) setMedications(prefill.medications);
    if (prefill.instructions) setInstructions(prefill.instructions);
    if (typeof prefill.validDays === "number") setValidDays(prefill.validDays);

    try {
      if (prefill.patient?.patientRecordId) {
        const res = await fetch(api("/records"));
        const data = await res.json();
        const chart = (data.records || []).find((c: Chart) => c.id === prefill.patient!.patientRecordId);
        if (chart) {
          setSelectedPatient(chart);
          setPlatformTarget(null);
        }
      } else if (prefill.patient?.displayName) {
        const res = await fetch(`${api("/records/search")}?q=${encodeURIComponent(prefill.patient.displayName)}`);
        const data = await res.json();
        const records: Chart[] = data.records || [];
        const targetId = prefill.patientAmbiguities?.[0]?.patientRecordId;
        const chart = (targetId ? records.find((c) => c.id === targetId) : records[0]) || null;
        if (chart) {
          setSelectedPatient(chart);
          setPlatformTarget(null);
        }
      }
      toast.success(
        lang === "es"
          ? "Receta completada por voz. Revise antes de guardar."
          : lang === "en"
            ? "Prescription prefilled by voice. Review before saving."
            : "Receita preenchida por voz. Confira antes de salvar.",
      );
    } catch {
      /* ignore */
    }
  }, [api, lang, toast]);

  useEffect(() => {
    void applyVoicePrefill();
  }, [pathname, searchParams, applyVoicePrefill]);

  useEffect(() => {
    const onVoicePrefill = () => {
      void applyVoicePrefill();
    };
    window.addEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
    return () => window.removeEventListener(VOICE_PRESCRIPTION_PREFILL_EVENT, onVoicePrefill);
  }, [applyVoicePrefill]);

  useEffect(() => {
    fetchAll();
    if (!cfg.skipDigitalSign) loadSignConfig();
    void loadCharts();
    const params = new URLSearchParams(window.location.search);
    const { patientRecordId, returnUrl, view: viewParam } = readChartDeepLink();

    if (returnUrl) setConsultReturnUrl(returnUrl);
    if (patientRecordId && returnUrl) setLockPatient(true);

    if (patientRecordId) {
      (async () => {
        await loadCharts();
        const recordsRes = await fetch(api("/records"));
        const recordsData = await recordsRes.json();
        const chart = (recordsData.records || []).find((c: Chart) => c.id === patientRecordId) || null;
        if (!chart) return;
        setSelectedPatient(chart as Chart);
        setReusePatient(chart as Chart);
        const v = viewParam as View | null;
        if (v === "prescription" || (!cfg.prescriptionsOnly && (v === "exam" || v === "document"))) {
          setView(v);
        } else {
          setView("prescription");
        }
      })();
    }

    if (params.get("add") === "phytotherapy") {
      setView("prescription");
      const mnSlug = params.get("mnSlug");
      if (mnSlug) {
        void (async () => {
          try {
            const res = await fetch(apiPath(cfg, `/medicina-natural/${encodeURIComponent(mnSlug)}`));
            const data = await res.json();
            if (!data.item) return;
            const item = data.item as {
              slug: string;
              nome: string;
              posologia: string;
              indicacoes: string;
            };
            setMedications((prev) => {
              if (prev.some((m) => m.mnSlug === item.slug)) return prev;
              return [
                ...prev,
                {
                  name: item.nome,
                  dosage: "",
                  frequency: "",
                  duration: "",
                  instructions: [item.posologia, item.indicacoes].filter(Boolean).join("\n\n").slice(0, 2000),
                  itemKind: "phytotherapy" as const,
                  mnSlug: item.slug,
                },
              ];
            });
            setFreeTextMode(true);
          } catch {
            /* prefill optional */
          }
        })();
      } else if (!patientRecordId) {
        setMedications((prev) => {
          if (prev.some((m) => m.itemKind === "phytotherapy")) return prev;
          return [
            ...prev,
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
              itemKind: "phytotherapy" as const,
            },
          ];
        });
      }
    }

    if (params.get("add") === "floral" && !patientRecordId) {
      setView("prescription");
      setFloralOnlyMode(true);
      const starter = params.get("starter");
      const templateId = params.get("templateId");
      const floralProduct = params.get("floralProduct");
      if (starter) {
        setPendingStarterId(starter);
      } else if (templateId) {
        setPendingTemplateId(templateId);
      } else if (floralProduct && floralProductByValue(floralProduct)) {
        setPendingFloralProductId(floralProduct);
      } else {
        setMedications((prev) => {
          if (prev.some((m) => m.itemKind === "floral")) return prev;
          return [
            ...prev,
            {
              name: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
              itemKind: "floral" as const,
            },
          ];
        });
      }
    }

    const docTemplateId = params.get("docTemplateId");
    const rxTemplateId = params.get("templateId");
    const viewFromUrl = params.get("view") as View | null;

    if (docTemplateId && !patientRecordId) {
      setPendingDocTemplateId(docTemplateId);
      if (viewFromUrl === "exam" || viewFromUrl === "document") {
        setView(viewFromUrl);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (rxTemplateId && !patientRecordId && params.get("add") !== "floral") {
      setPendingTemplateId(rxTemplateId);
      if (viewFromUrl === "prescription") {
        setView("prescription");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    const sign = params.get("sign");
    const flow = params.get("flow");
    const kind = params.get("kind") as EmissionKind | null;
    const id = params.get("id");

    if (flow === "deliver" && sign === "success" && kind && id) {
      (async () => {
        const patient = await loadEmissionPatient(kind, id);
        setSavedEmission({
          kind,
          id,
          label: "",
          patient: patient ?? {
            id: "",
            firstName: "",
            lastName: "",
            email: null,
            hasAccount: false,
          },
        });
        setPostSaveStep("deliver");
        fetchAll();
        window.history.replaceState({}, "", window.location.pathname);
      })();
    } else if (sign === "processing") {
      setSignProcessing(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (sign && sign !== "success") {
      setSignResult(sign);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSignResult(null), 6000);
    } else if (sign === "success" && !flow) {
      setSignResult("success");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSignResult(null), 6000);
    }
  }, []);

  useEffect(() => {
    if (!pendingStarterId) return;
    const resolved = resolveFloralStarter(pendingStarterId, lang);
    if (resolved) {
      setMedications(resolved.medications);
      setInstructions(resolved.instructions);
      setValidDays(resolved.validDays);
      setView("prescription");
    }
    setPendingStarterId(null);
  }, [pendingStarterId, lang]);

  useEffect(() => {
    if (!pendingTemplateId) return;
    const tpl = rxTemplates.find((x) => x.id === pendingTemplateId);
    if (tpl) {
      applyRxTemplate(tpl);
      setView("prescription");
      setTemplateAppliedHint(true);
      setPendingTemplateId(null);
    }
  }, [pendingTemplateId, rxTemplates]);

  useEffect(() => {
    if (!pendingDocTemplateId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/professional/templates/documents?previewId=${encodeURIComponent(pendingDocTemplateId)}&locale=${encodeURIComponent(locale)}`,
        );
        const data = await res.json();
        const tpl = data.template as {
          id: string;
          templateCategory: string | null;
          title: string;
          body: string;
        } | undefined;
        if (!tpl) return;

        if (isExamTemplateCategory(tpl.templateCategory)) {
          const parsed = parseExamTemplateBody(tpl.body);
          setExamTemplatePrefill({
            items: parsed.items,
            notes: parsed.notes || "",
            cid: parsed.cid || "",
            title: tpl.title || t("rx.examDefaultTitle"),
          });
          setView("exam");
          setTemplateAppliedHint(true);
        } else if (tpl.templateCategory === TEMPLATE_CATEGORIES.CERTIFICATE) {
          setDocTemplatePrefill({
            body: data.preview?.body || tpl.body,
            templateId: tpl.id,
          });
          setView("document");
          setTemplateAppliedHint(true);
        }
      } catch {
        /* ignore */
      } finally {
        setPendingDocTemplateId(null);
      }
    })();
  }, [pendingDocTemplateId, locale, t]);

  useEffect(() => {
    if (!pendingFloralProductId) return;
    const product = floralProductByValue(pendingFloralProductId);
    if (!product) {
      setPendingFloralProductId(null);
      return;
    }
    setMedications([
      {
        name: t(product.labelKey),
        dosage: "4 gotas, 4x/dia",
        frequency: "",
        duration: "",
        instructions: "",
        itemKind: "floral",
        floralProductId: pendingFloralProductId,
      },
    ]);
    setView("prescription");
    setFloralOnlyMode(true);
    setPendingFloralProductId(null);
  }, [pendingFloralProductId, t]);

  async function loadEmissionPatient(kind: EmissionKind, id: string): Promise<Chart | null> {
    try {
      const [chartsRes, rxRes, docRes] = await Promise.all([
        fetch(api("/records")),
        kind === "prescription" ? fetch(api("/prescriptions")) : Promise.resolve(null),
        kind !== "prescription" && !cfg.prescriptionsOnly ? fetch(api("/documents/issued")) : Promise.resolve(null),
      ]);
      const chartsData = await chartsRes.json();
      const chartsList: Chart[] = chartsData.records || [];

      if (kind === "prescription" && rxRes) {
        const rxData = await rxRes.json();
        const p = (rxData.prescriptions || []).find((x: Prescription) => x.id === id);
        if (!p) return null;
        if (p.patientRecordId) {
          return chartsList.find((c) => c.id === p.patientRecordId) || null;
        }
        if (p.document?.patient) {
          const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
          return chartsList.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target) || {
            id: "",
            firstName: p.document.patient.firstName,
            lastName: p.document.patient.lastName,
            email: null,
            hasAccount: true,
          };
        }
        return null;
      }

      if (docRes) {
        const docData = await docRes.json();
        const d = (docData.documents || []).find((x: ClinicalDocument) => x.id === id);
        if (!d) return null;
        if (d.patientRecordId) {
          return chartsList.find((c) => c.id === d.patientRecordId) || null;
        }
        if (d.document?.patient) {
          return {
            id: "",
            firstName: d.document.patient.firstName,
            lastName: d.document.patient.lastName,
            email: null,
            hasAccount: true,
          };
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch(api("/prescriptions"), { credentials: "same-origin" }),
        fetch(api("/templates/prescriptions"), { credentials: "same-origin" }),
      ];
      if (!cfg.prescriptionsOnly) {
        requests.splice(1, 0, fetch(api("/documents/issued"), { credentials: "same-origin" }));
      }
      const results = await Promise.all(requests);
      const rxRes = results[0];
      const tplRes = results[cfg.prescriptionsOnly ? 1 : 2];
      const docRes = cfg.prescriptionsOnly ? null : results[1];
      const rxData = await rxRes.json();
      const tplData = await tplRes.json();
      setPrescriptions(rxData.prescriptions || []);
      if (docRes) {
        const docData = await docRes.json();
        setClinicalDocs(docData.documents || []);
      } else {
        setClinicalDocs([]);
      }
      if (tplRes.ok) setRxTemplates(tplData.templates || []);
    } finally { setLoading(false); }
  }

  async function fetchPrescriptions() { await fetchAll(); }

  async function loadSignConfig() {
    try {
      const res = await fetch(api("/digital-sign"));
      setSignConfig(await res.json());
    } catch { /* ignore */ }
  }

  async function searchPatients(q: string) {
    setChartsLoading(true);
    try {
      const res = await fetch(`${api("/records/search")}?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (res.ok) {
        setCharts(d.records || []);
        setImportablePatients(d.importable || []);
        setPlatformMatches(d.platformMatches || []);
      }
    } catch { /* ignore */ }
    finally { setChartsLoading(false); }
  }

  async function loadCharts() {
    await searchPatients("");
  }

  async function importPatientChart(item: ImportablePatient) {
    setImportingPatientId(item.patientProfileId);
    try {
      const res = await fetch(api("/records/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientProfileId: item.patientProfileId }),
      });
      const data = await res.json();
      if (res.ok) {
        const chart: Chart = {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? item.email,
          hasAccount: true,
          missingForRx: data.missingForRx,
        };
        setSelectedPatient(chart);
        setPlatformTarget(null);
        setPatientQuery("");
        setPatientPickerOpen(false);
        await searchPatients("");
      } else if (res.status === 403 && data.code === "LINK_REQUIRED") {
        setFormError(t("link.requiredImport"));
      }
    } catch { /* ignore */ }
    finally { setImportingPatientId(null); }
  }

  async function requestPatientLink(match: PlatformMatch) {
    setRequestingLinkId(match.patientUserId);
    try {
      const res = await fetch(api("/patient-links"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientUserId: match.patientUserId }),
      });
      if (res.ok) {
        await searchPatients(patientQuery);
      }
    } finally {
      setRequestingLinkId(null);
    }
  }

  function selectPlatformForRx(match: PlatformMatch) {
    setPlatformTarget({
      patientUserId: match.patientUserId,
      patientProfileId: match.patientProfileId,
      displayName: match.displayName,
      linkStatus: match.linkStatus,
    });
    setSelectedPatient(null);
    setPatientPickerOpen(false);
    setPatientQuery("");
  }

  function resetForm() {
    setSelectedPatient(null);
    setPlatformTarget(null);
    setPatientQuery("");
    setImportablePatients([]);
    setPlatformMatches([]);
    setDrugQuery(""); setDrugResults([]); setDrugCountry("BR"); setDrugSearchDone(false); setDrugSearchModalOpen(false); setMedications([]);
    setHighlightIncompleteMeds(false);
    setInstructions(""); setValidDays(30); setFormError("");
    setReuseSource(null);
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setFreeTextMode(false);
    setBulkPasteText("");
  }

  function handleEmissionSaved(emission: SavedEmission) {
    setSavedEmission(emission);
    if (cfg.skipDigitalSign) {
      setPostSaveStep("deliver");
    } else if (
      (emission.kind === "prescription" && emission.medications?.length) ||
      (emission.kind === "exam" && emission.examItems?.length) ||
      (emission.kind === "document" && emission.documentBody?.trim())
    ) {
      setPostSaveStep("review");
    } else {
      setPostSaveStep("choose");
    }
    setPostSaveShareUrl("");
    fetchAll();
  }

  function finishPostSave() {
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    fetchAll();
  }

  async function openCreate() {
    resetForm();
    setShowBulkPaste(true);
    setView("prescription");
    await loadCharts();
  }

  async function openExamCreate() {
    setReuseClinical(null);
    setReusePatient(null);
    setView("exam");
    await loadCharts();
  }

  async function openDocumentCreate() {
    setReuseClinical(null);
    setReusePatient(null);
    setView("document");
    await loadCharts();
  }

  async function resolvePatientChart(patientRecordId?: string | null, patient?: { firstName: string; lastName: string } | null) {
    const recordsRes = await fetch(api("/records"));
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);
    if (patientRecordId) {
      return records.find((c) => c.id === patientRecordId) || null;
    }
    if (patient) {
      const target = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target) || null;
    }
    return null;
  }

  async function openReuseClinical(d: ClinicalDocument) {
    setReuseClinical(d);
    const chart = await resolvePatientChart(d.patientRecordId, d.document?.patient);
    setReusePatient(chart);
    setView(isExamDocType(d.type) ? "exam" : "document");
  }

  function closeCreate() {
    setView("hub");
    resetForm();
    setReuseClinical(null);
    setReusePatient(null);
    setExamTemplatePrefill(null);
    setDocTemplatePrefill(null);
    setTemplateAppliedHint(false);
    fetchAll();
  }

  function signPrescription(p: Prescription) {
    if (p.signatureStatus === "PENDING") return;
    const label = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
      : t("rx.patient");
    setSignTarget({ kind: "prescription", id: p.id, label });
  }

  function signClinicalDoc(d: ClinicalDocument) {
    if (d.signatureStatus === "PENDING") return;
    const label = d.title;
    setSignTarget({ kind: emissionKindFromDoc(d.type), id: d.id, label });
  }

  async function openReuse(p: Prescription) {
    resetForm();
    setReuseSource(p);
    setView("prescription");
    await loadCharts();

    const meds = (p.medications as MedItem[]).map((m) => ({ ...m }));
    setMedications(meds);
    if (p.instructions) setInstructions(p.instructions);

    const recordsRes = await fetch(api("/records"));
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);

    if (p.patientRecordId) {
      const chart = records.find((c) => c.id === p.patientRecordId);
      if (chart) setSelectedPatient(chart);
    } else if (p.document?.patient) {
      const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
      const chart = records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target);
      if (chart) setSelectedPatient(chart);
    }
  }

  const showPatientPicker = patientPickerOpen && !selectedPatient;

  useEffect(() => {
    if (!patientPickerOpen && !patientQuery.trim()) return;
    if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
    patientSearchDebounce.current = setTimeout(() => {
      void searchPatients(patientQuery);
    }, 250);
    return () => {
      if (patientSearchDebounce.current) clearTimeout(patientSearchDebounce.current);
    };
  }, [patientQuery, patientPickerOpen]);

  const searchDrugs = useCallback(async () => {
    const q = drugQuery.trim();
    if (q.length < 2) return;
    setDrugSearchModalOpen(true);
    setDrugSearching(true);
    setDrugSearchDone(false);
    setDrugResults([]);
    try {
      if (cfg.phytoOnly) {
        const url = `${apiPath(cfg, "/medicina-natural/search")}?q=${encodeURIComponent(q)}&categoria=FITOTERAPICO&take=20`;
        const res = await fetch(url);
        const d = await res.json();
        if (!res.ok) {
          toast.error(typeof d.error === "string" ? d.error : t("rx2.noDrugsFound"));
          setDrugResults([]);
        } else {
          const matches = (d.items || []).map((item: {
            slug: string;
            nome: string;
            nomeCientifico: string | null;
            posologia: string;
            indicacoes: string;
            statusRegulatorio: string;
          }) => ({
            id: item.slug,
            name: item.nome,
            activeIngredient: item.nomeCientifico || item.nome,
            dosage: item.posologia?.slice(0, 120) || "",
            presentation: item.indicacoes?.slice(0, 200) || "",
            pharmaceuticalForm: item.statusRegulatorio || "",
            manufacturer: "",
            controlled: false,
            prescriptionType: null,
          }));
          setDrugResults(matches);
        }
      } else {
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}&country=${drugCountry}`;
        const res = await fetch(url);
        const d = await res.json();
        if (!res.ok) {
          toast.error(typeof d.error === "string" ? d.error : t("rx2.noDrugsFound"));
          setDrugResults([]);
        } else {
          setDrugResults(d.drugs || []);
        }
      }
    } catch {
      toast.error(t("rx2.noDrugsFound"));
      setDrugResults([]);
    } finally {
      setDrugSearching(false);
      setDrugSearchDone(true);
    }
  }, [drugQuery, drugCountry, cfg.phytoOnly, t, toast]);

  function closeDrugSearchModal() {
    setDrugSearchModalOpen(false);
    setDrugResults([]);
    setDrugSearchDone(false);
  }

  function addDrug(drug: DrugSearchResult) {
    setFreeTextMode(false);
    if (cfg.phytoOnly) {
      setMedications((prev) => [...prev, {
        name: drug.name,
        dosage: drug.dosage?.trim() || "",
        frequency: "",
        duration: "",
        instructions: drug.presentation?.trim() || "",
        itemKind: "phytotherapy" as const,
        mnSlug: drug.id,
      }]);
      setDrugQuery("");
      setDrugResults([]);
      setDrugSearchModalOpen(false);
      return;
    }
    const substance = drug.activeIngredient?.trim() || drug.name;
    setMedications((prev) => [...prev, {
      name: substance,
      dosage: drug.dosage?.trim() || "",
      frequency: "",
      duration: "",
      instructions: "",
      presentation: drug.presentation,
      pharmaceuticalForm: drug.pharmaceuticalForm?.trim() || "",
      controlled: drug.controlled,
      prescriptionType: drug.prescriptionType,
      itemKind: cfg.phytoOnly ? "phytotherapy" as const : "medication",
    }]);
  }

  function flagIncompleteMeds(): void {
    setHighlightIncompleteMeds(true);
    setFormError(t("rx2.incompleteItems"));
  }

  function addManual() {
    setFreeTextMode(false);
    const name = drugQuery.trim();
    setMedications((prev) => [...prev, {
      name: name || "",
      dosage: "", frequency: "", duration: "", instructions: "",
      itemKind: cfg.phytoOnly ? "phytotherapy" : "medication",
    }]);
    setDrugQuery(""); setDrugResults([]); setDrugSearchModalOpen(false);
  }

  function addSpecialItem(kind: "device" | "phytotherapy" | "floral") {
    if (isFreeTextPrescriptionItem(kind)) {
      setFreeTextMode(true);
    }
    setMedications((prev) => [...prev, {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      itemKind: kind,
    }]);
  }

  function importBulkMedications() {
    const parsed = parseBulkMedicationLines(
      bulkPasteText,
      freeTextMode ? "device" : "medication",
    );
    if (parsed.length === 0) {
      setFormError(t("rx.bulkPaste.empty"));
      return;
    }
    setMedications((prev) => [...prev, ...parsed]);
    setBulkPasteText("");
    setShowBulkPaste(false);
    setFormError("");
  }

  function startFreeTextPrescription() {
    setFreeTextMode(true);
    setMedications([{
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      itemKind: "device",
    }]);
    setShowBulkPaste(false);
    setBulkPasteText("");
    setFormError("");
    setHighlightIncompleteMeds(false);
  }

  function applyFreeTextPrescription() {
    const parsed = parseBulkMedicationLines(bulkPasteText, "device");
    if (parsed.length === 0) {
      setFormError(t("rx.bulkPaste.empty"));
      return;
    }
    setFreeTextMode(true);
    setMedications(parsed);
    setBulkPasteText("");
    setShowBulkPaste(false);
    setFormError("");
  }

  function removeMedication(index: number) { setMedications((prev) => prev.filter((_, i) => i !== index)); }
  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function selectPhytoProduct(index: number, productId: string) {
    const product = phytotherapyProductByValue(productId);
    setMedications((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              phytoProductId: productId,
              name: product && productId !== "other" && productId !== "planta_medicinal"
                ? t(product.labelKey)
                : m.name,
            }
          : m,
      ),
    );
  }

  function selectFloralProduct(index: number, productId: string) {
    const product = floralProductByValue(productId);
    setMedications((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              floralProductId: productId,
              name: product && productId !== "floral_custom" ? t(product.labelKey) : m.name,
              dosage: m.dosage || (productId.startsWith("bach_") || productId.startsWith("sg") ? "4 gotas, 4x/dia" : m.dosage),
            }
          : m,
      ),
    );
  }

  function applyRxTemplate(tpl: RxTemplate) {
    setMedications((tpl.medications as MedItem[]).map((m) => ({ ...m })));
    setInstructions(tpl.instructions || "");
    setValidDays(tpl.validDays || 30);
    setReuseSource(null);
  }

  async function saveAsRxTemplate() {
    if (!isMedsFormValid(medications)) {
      flagIncompleteMeds();
      return;
    }
    setHighlightIncompleteMeds(false);
    const name = window.prompt(t("tmpl.rxNamePrompt"));
    if (!name?.trim()) return;
    setSavingTemplate(true);
    setFormError("");
    try {
      await extendSessionForWrite(updateSession);
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration,
        instructions: m.instructions,
        presentation: m.presentation || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "",
        itemKind: m.itemKind || "medication",
        phytoProductId: m.phytoProductId || undefined,
        floralProductId: m.floralProductId || undefined,
      }));
      const res = await fetch(api("/templates/prescriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          medications: cleanMeds,
          instructions,
          validDays,
        }),
      });
      const data = await res.json();
      if (isAuthFailureStatus(res.status)) {
        setFormError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
        return;
      }
      if (!res.ok) throw new Error(data.error || t("tmpl.saveError"));
      setRxTemplates((prev) => [data, ...prev]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("tmpl.saveError"));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient && !platformTarget) { setFormError(t("rx2.needPatient")); return; }
    if (!isMedsFormValid(medications)) {
      flagIncompleteMeds();
      return;
    }
    setHighlightIncompleteMeds(false);
    setSaving(true);
    try {
      await extendSessionForWrite(updateSession);
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration,
        instructions: m.instructions,
        presentation: m.presentation || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "",
        itemKind: m.itemKind || "medication",
        phytoProductId: m.phytoProductId || undefined,
        floralProductId: m.floralProductId || undefined,
      }));
      const payload = selectedPatient
        ? { [cfg.patientRecordField]: selectedPatient.id, medications: cleanMeds, instructions, validDays }
        : { patientUserId: platformTarget!.patientUserId, medications: cleanMeds, instructions, validDays };
      const res = await fetch(api("/prescriptions"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const label = selectedPatient
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : platformTarget!.displayName;
        const patientForSave: Chart = selectedPatient ?? {
          id: "",
          firstName: platformTarget!.displayName.split(" ")[0] || platformTarget!.displayName,
          lastName: "",
          email: null,
          hasAccount: true,
        };
        handleEmissionSaved({
          kind: "prescription",
          id: data.prescriptionId,
          patient: patientForSave,
          label,
          medications: cleanMeds,
          instructions: instructions.trim() || undefined,
        });
      } else if (isAuthFailureStatus(res.status)) {
        setFormError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx2.needMeds"));
      }
    } finally { setSaving(false); }
  }

  const filtered = prescriptions.filter((p) => {
    if (listFilter === "exam" || listFilter === "document") return false;
    const name = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase() : "";
    return name.includes(search.toLowerCase());
  });

  const recentPrescriptions = prescriptions.slice(0, 8);
  const recentClinical = clinicalDocs.slice(0, 8);
  const selectedMissing = selectedPatient?.missingForRx ?? [];
  const todayLabel = new Date().toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  const filteredClinical = clinicalDocs.filter((d) => {
    const name = d.document?.patient
      ? `${d.document.patient.firstName} ${d.document.patient.lastName}`.toLowerCase() : "";
    const matchSearch = name.includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (listFilter === "exam") return isExamDocType(d.type);
    if (listFilter === "document") return !isExamDocType(d.type);
    if (listFilter === "prescription") return false;
    return true;
  });

  const showPrescriptionList = listFilter === "all" || listFilter === "prescription";
  const showClinicalList = listFilter === "all" || listFilter === "exam" || listFilter === "document";

  if (savedEmission) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-8">
        <EmissionPostSaveFlow
          emission={savedEmission}
          t={t}
          lang={lang}
          signConfig={signConfig}
          initialStep={postSaveStep}
          initialShareUrl={postSaveShareUrl}
          onDone={finishPostSave}
          deliveryOnly={cfg.skipDigitalSign}
          apiBase={cfg.apiBase}
        />
        <style>{RX_STYLES}</style>
      </div>
    );
  }

  if (view === "exam") {
    return (
      <>
        <VideoConsultReturnBanner returnUrl={consultReturnUrl} patientName={reusePatient ? `${reusePatient.firstName} ${reusePatient.lastName}` : undefined} lang={lang as "pt" | "en" | "es"} />
        <ExamCreateView
          t={t} locale={locale} charts={charts} chartsLoading={chartsLoading}
          reuseHint={!!reuseClinical}
          templateHint={templateAppliedHint}
          initialPatient={reusePatient}
          lockPatient={lockPatient}
          initialItems={examTemplatePrefill?.items || reuseClinical?.examItems || []}
          initialNotes={examTemplatePrefill?.notes || reuseClinical?.examNotes || ""}
          initialCid={examTemplatePrefill?.cid || reuseClinical?.cid || ""}
          initialTitle={examTemplatePrefill?.title || reuseClinical?.title || ""}
          onBack={closeCreate}
          onSaved={handleEmissionSaved}
        />
        <style>{RX_STYLES}</style>
      </>
    );
  }

  if (view === "document") {
    return (
      <>
        <VideoConsultReturnBanner returnUrl={consultReturnUrl} patientName={reusePatient ? `${reusePatient.firstName} ${reusePatient.lastName}` : undefined} lang={lang as "pt" | "en" | "es"} />
        <DocumentCreateView
          t={t} charts={charts} chartsLoading={chartsLoading}
          reuseHint={!!reuseClinical}
          templateHint={templateAppliedHint}
          initialPatient={reusePatient}
          lockPatient={lockPatient}
          initialBody={docTemplatePrefill?.body || reuseClinical?.content || ""}
          initialType={reuseClinical?.type || "CERTIFICATE"}
          initialTemplateId={docTemplatePrefill?.templateId || null}
          onBack={closeCreate}
          onSaved={handleEmissionSaved}
        />
        <style>{RX_STYLES}</style>
      </>
    );
  }

  // ── PRESCRIPTION CREATE VIEW ──────────────────────────────────────────────
  if (view === "prescription") {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24">
        <VideoConsultReturnBanner returnUrl={consultReturnUrl} patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined} lang={lang as "pt" | "en" | "es"} />
        <button onClick={closeCreate}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 transition font-medium">
          <ArrowLeft size={16} /> {t("rx.backToList")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.formTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.formSubtitle")}</p>
        </div>

        {templateAppliedHint && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
            {t("tmpl.templateAppliedHint")}
          </div>
        )}

        {voicePrefillActive && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles size={18} className="text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-800">
                {lang === "es" ? "Completado por asistente de voz" : lang === "en" ? "Prefilled by voice assistant" : "Preenchido pelo assistente de voz"}
              </p>
              <p className="text-xs text-violet-700 mt-1">
                {lang === "es" ? "Revise todos los campos antes de guardar." : lang === "en" ? "Review all fields before saving." : "Confira todos os campos antes de salvar."}
              </p>
            </div>
          </div>
        )}

        {reuseSource && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
            <Copy size={18} className="text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-700">{t("rx.reuseTitle")}</p>
              <p className="text-xs text-brand-600 mt-1">{t("rx.reuseHint")}</p>
            </div>
          </div>
        )}

        <>
            {/* Patient card */}
            <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4 ${showPatientPicker ? "relative z-50" : ""}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="text-sm font-semibold text-slate-800">{t("rx2.selectPatient")}</label>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{t("rx.documentDate")}:</span>
                  <span className="font-medium text-slate-700">{todayLabel}</span>
                </div>
              </div>

              {selectedPatient ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
                      {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      <p className="text-xs mt-0.5 text-slate-500">
                        {selectedPatient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
                      </p>
                    </div>
                    {!lockPatient && (
                    <button onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                      className="text-xs text-brand-500 hover:text-brand-700 font-semibold shrink-0">
                      {t("rx2.changePatient")}
                    </button>
                    )}
                  </div>
                  <PatientNoAccountPanel patient={selectedPatient} />
                </div>
              ) : platformTarget ? (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                    {platformTarget.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{platformTarget.displayName}</p>
                    <p className="text-xs text-slate-500">{t("link.platformRxHint")}</p>
                    {platformTarget.linkStatus === "PENDING" && (
                      <p className="text-xs text-amber-600 mt-0.5">{t("link.statusPending")}</p>
                    )}
                    {platformTarget.linkStatus === "ACCEPTED" && (
                      <p className="text-xs text-brand-600 mt-0.5">{t("link.statusAccepted")}</p>
                    )}
                  </div>
                  {!lockPatient && (
                    <button
                      onClick={() => setPlatformTarget(null)}
                      className="text-xs text-brand-500 hover:text-brand-700 font-semibold shrink-0"
                    >
                      {t("rx2.changePatient")}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      onFocus={() => setPatientPickerOpen(true)}
                      onBlur={() => setTimeout(() => setPatientPickerOpen(false), 150)}
                      placeholder={t("rx2.searchPatient")}
                      className="rx-inp rx-inp-pl-9" />
                  </div>
                  {showPatientPicker && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {chartsLoading ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                          <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
                        </div>
                      ) : charts.length === 0 && importablePatients.length === 0 && platformMatches.length === 0 ? (
                        patientQuery.trim() ? (
                          <div className="p-4 text-center text-sm text-slate-500 space-y-1">
                            <p>{t("pat.searchEmpty")}</p>
                            {patientQuery.trim().length > 0 && patientQuery.trim().length < 3 && (
                              <p className="text-xs text-slate-400">{t("link.searchMinChars")}</p>
                            )}
                            {patientQuery.trim().length >= 3 && (
                              <p className="text-xs text-slate-400">{t("rx2.noPatientHint")}</p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2">
                            <NoPatientChartsEmptyState variant="brand" compact />
                          </div>
                        )
                      ) : (
                        <>
                          {charts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={keepFocusOnPointerDown}
                              onClick={() => { setSelectedPatient(c); setPlatformTarget(null); setPatientPickerOpen(false); setPatientQuery(""); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition text-left"
                            >
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                                {c.firstName[0]}{c.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 text-sm">{c.firstName} {c.lastName}</p>
                                <p className="text-xs text-slate-400">{c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}</p>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 shrink-0" />
                            </button>
                          ))}
                          {!cfg.prescriptionsOnly && importablePatients.map((item) => (
                            <button
                              key={item.patientProfileId}
                              type="button"
                              disabled={importingPatientId === item.patientProfileId}
                              onMouseDown={keepFocusOnPointerDown}
                              onClick={() => importPatientChart(item)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition text-left disabled:opacity-50"
                            >
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0">
                                {item.firstName[0]}{item.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 text-sm">{item.firstName} {item.lastName}</p>
                                <p className="text-xs text-emerald-600">{t("rx2.importPatientBadge")}</p>
                                {item.email && <p className="text-xs text-slate-400 truncate">{item.email}</p>}
                              </div>
                              {importingPatientId === item.patientProfileId ? (
                                <Loader2 size={16} className="animate-spin text-emerald-500 shrink-0" />
                              ) : (
                                <span className="text-xs font-semibold text-emerald-600 shrink-0">{t("rx2.importPatientChart")}</span>
                              )}
                            </button>
                          ))}
                          {!cfg.prescriptionsOnly && platformMatches.map((match) => (
                            <div
                              key={match.patientProfileId}
                              className="px-4 py-3 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                                  {match.displayName[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 text-sm">{match.displayName}</p>
                                  {match.city && (
                                    <p className="text-xs text-slate-400">{match.city}</p>
                                  )}
                                  <p className="text-xs text-slate-500">
                                    {match.linkStatus === "ACCEPTED"
                                      ? t("link.statusAccepted")
                                      : match.linkStatus === "PENDING"
                                        ? t("link.statusPending")
                                        : t("link.platformBadge")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {match.linkStatus !== "ACCEPTED" && match.linkStatus !== "PENDING" && (
                                  <button
                                    type="button"
                                    disabled={requestingLinkId === match.patientUserId}
                                    onMouseDown={keepFocusOnPointerDown}
                                    onClick={() => requestPatientLink(match)}
                                    className="text-xs font-semibold border border-brand-200 text-brand-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50 min-h-[44px]"
                                  >
                                    {requestingLinkId === match.patientUserId ? (
                                      <Loader2 size={14} className="animate-spin inline" />
                                    ) : (
                                      t("link.requestConnection")
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onMouseDown={keepFocusOnPointerDown}
                                  onClick={() => selectPlatformForRx(match)}
                                  className="text-xs font-semibold bg-brand-500 text-white px-2.5 py-1.5 rounded-lg min-h-[44px]"
                                >
                                  {t("link.prescribeWithoutChart")}
                                </button>
                                {match.hasLink && (
                                  <button
                                    type="button"
                                    disabled={importingPatientId === match.patientProfileId}
                                    onMouseDown={keepFocusOnPointerDown}
                                    onClick={() => importPatientChart({
                                      patientProfileId: match.patientProfileId,
                                      userId: match.patientUserId,
                                      firstName: match.displayName.split(" ")[0] || match.displayName,
                                      lastName: "",
                                      email: null,
                                      hasAccount: true,
                                      source: "appointment",
                                    })}
                                    className="text-xs font-semibold border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg disabled:opacity-50 min-h-[44px]"
                                  >
                                    {importingPatientId === match.patientProfileId ? (
                                      <Loader2 size={14} className="animate-spin inline" />
                                    ) : (
                                      t("rx2.importPatientChart")
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedPatient && selectedMissing.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Complete na ficha: <strong>{selectedMissing.map(missingLabel).join(", ")}</strong>
                  </p>
                </div>
              )}
            </div>

            {rxTemplates.length > 0 && (() => {
              const visibleTemplates = floralOnlyMode
                ? rxTemplates.filter((tpl) => templateHasFloralItems(tpl.medications as MedItem[]))
                : rxTemplates;
              if (visibleTemplates.length === 0) return null;
              return (
              <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <LayoutTemplate size={16} className="text-brand-500" /> {t("tmpl.savedRxTemplates")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyRxTemplate(tpl)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-slate-700"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
              );
            })()}

            {/* Add item card */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">{t("rx2.addItem")}</label>
                {cfg.phytoOnly ? (
                  <p className="text-xs text-slate-500">{t("rx.addPhytotherapy")} · {t("rx.addFloral")}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{t("rx2.countryPick")}</p>
                    <div className="flex flex-wrap gap-2">
                      {DRUG_COUNTRIES.map((c) => {
                        const selected = drugCountry === c.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setDrugCountry(c.code);
                              setDrugQuery("");
                              setDrugResults([]);
                              setDrugSearchDone(false);
                              setDrugSearchModalOpen(false);
                            }}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                              selected
                                ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                                : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50"
                            }`}
                            aria-pressed={selected}
                          >
                            <span className="text-lg leading-none" aria-hidden>{c.flag}</span>
                            {t(c.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_rgba(33,106,134,.12)]">
                <input
                  type="text"
                  value={drugQuery}
                  onChange={(e) => setDrugQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchDrugs();
                    }
                  }}
                  placeholder={cfg.phytoOnly ? t("rx.phytoProductSelect") : t("rx2.searchDrug")}
                  className="flex-1 min-w-0 border-0 bg-transparent outline-none py-3 pl-3.5 pr-2 text-sm text-slate-800 placeholder:text-slate-400 rounded-xl"
                />
                {drugSearching ? (
                  <Loader2 size={15} className="shrink-0 mr-3 text-slate-400 animate-spin" />
                ) : (
                  <button
                    type="button"
                    onClick={() => void searchDrugs()}
                    disabled={drugQuery.trim().length < 2}
                    className="shrink-0 mr-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("pubSearch.search")}
                  </button>
                )}
              </div>

              <button type="button" onClick={addManual}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-600 font-semibold text-sm transition">
                <Plus size={16} /> {t("rx2.addManual")}
              </button>

              <button type="button" onClick={startFreeTextPrescription}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition">
                <FileText size={16} /> {t("rx.freeTextStart")}
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{t("rx.bulkPaste.title")}</p>
                  <button
                    type="button"
                    onClick={() => setShowBulkPaste((v) => !v)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                  >
                    {showBulkPaste ? t("rx.bulkPaste.hide") : t("rx.bulkPaste.show")}
                  </button>
                </div>
                {showBulkPaste && (
                  <>
                    <textarea
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      rows={6}
                      placeholder={freeTextMode ? t("rx.bulkPaste.devicePlaceholder") : t("rx.bulkPaste.placeholder")}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-y bg-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={importBulkMedications}
                        disabled={!bulkPasteText.trim()}
                        className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50"
                      >
                        {t("rx.bulkPaste.addToList")}
                      </button>
                      <button
                        type="button"
                        onClick={applyFreeTextPrescription}
                        disabled={!bulkPasteText.trim()}
                        className="flex-1 min-w-[140px] py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm disabled:opacity-50"
                      >
                        {t("rx.bulkPaste.replaceList")}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {!cfg.phytoOnly && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => addSpecialItem("device")}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition">
                    <Plus size={14} /> {t("rx.addDevice")}
                  </button>
                  <button type="button" onClick={() => addSpecialItem("phytotherapy")}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-medium text-sm transition">
                    <Plus size={14} /> {t("rx.addPhytotherapy")}
                  </button>
                </div>
              )}
              {cfg.phytoOnly && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => addSpecialItem("phytotherapy")}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-medium text-sm transition">
                    <Plus size={14} /> {t("rx.addPhytotherapy")}
                  </button>
                  {cfg.allowFloral && (
                    <button type="button" onClick={() => addSpecialItem("floral")}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-pink-200 bg-pink-50/50 hover:bg-pink-50 text-pink-800 font-medium text-sm transition">
                      <Plus size={14} /> {t("rx.addFloral")}
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400 text-center -mt-2">{t("rx.manualAlways")}</p>
            </div>

            {/* Prescription items */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <label className="text-sm font-semibold text-slate-800">{t("rx2.selectedMeds")}</label>
              {medications.length === 0 ? (
                <div className={`text-center py-8 rounded-xl border border-dashed ${
                  highlightIncompleteMeds
                    ? "bg-rose-50 border-rose-300"
                    : "bg-slate-50 border-slate-200"
                }`}>
                  <Pill size={28} className={`mx-auto mb-2 ${highlightIncompleteMeds ? "text-rose-300" : "text-slate-300"}`} />
                  <p className={`text-sm ${highlightIncompleteMeds ? "text-rose-600" : "text-slate-400"}`}>{t("rx2.noMeds")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med, index) => {
                    const kind = med.itemKind || "medication";
                    const kindLabel = kind === "device" ? t("rx.itemKind.device")
                      : kind === "phytotherapy" ? t("rx.itemKind.phytotherapy")
                      : kind === "floral" ? t("rx.itemKind.floral") : null;
                    const fieldErrors = medItemFieldErrors(med);
                    const itemInvalid = !isMedItemValid(med);
                    const showErrors = highlightIncompleteMeds && itemInvalid;
                    return (
                      <PrescriptionMedItemForm
                        key={index}
                        med={med}
                        index={index}
                        showErrors={showErrors}
                        fieldErrors={fieldErrors}
                        kindLabel={kindLabel}
                        controlInfo={controlInfo(med.prescriptionType)}
                        onUpdate={updateMedication}
                        onPhytoProductSelect={selectPhytoProduct}
                        onFloralProductSelect={selectFloralProduct}
                        onRemove={removeMedication}
                        t={t}
                        rxFieldClass={rxFieldClass}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructions + validity */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx.generalInstructions")}</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
                  placeholder={t("rx.generalInstructionsPlaceholder")} className="rx-inp resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx2.validFor")}</label>
                <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="rx-inp">
                  <option value={7}>{t("rx.days7")}</option>
                  <option value={30}>{t("rx.days30")}</option>
                  <option value={60}>{t("rx.days60")}</option>
                  <option value={90}>{t("rx.days90")}</option>
                  <option value={180}>{t("rx.days180")}</option>
                  <option value={365}>{t("rx.days365")}</option>
                </select>
              </div>
            </div>

            {formError && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{formError}</p>}
        </>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
            <div className="max-w-3xl mx-auto flex gap-2">
              <button type="button" onClick={closeCreate}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                {t("rx2.cancel")}
              </button>
              <button type="button" onClick={saveAsRxTemplate} disabled={savingTemplate || medications.length === 0}
                className="px-4 py-3.5 rounded-xl border border-brand-200 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                title={t("tmpl.saveRxTemplate")}>
                {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
                <span className="hidden sm:inline">{t("tmpl.saveRxTemplate")}</span>
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {saving ? t("rx2.saving") : t("rx2.save")}
              </button>
            </div>
          </div>

        <style>{RX_STYLES}</style>

        {drugSearchModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
            onClick={closeDrugSearchModal}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900">{t("rx2.drugSearchModalTitle")}</h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">&ldquo;{drugQuery.trim()}&rdquo;</p>
                </div>
                <button
                  type="button"
                  onClick={closeDrugSearchModal}
                  className="text-slate-400 hover:text-slate-600 shrink-0 p-1 rounded-lg hover:bg-slate-100 transition"
                  aria-label={t("rx2.cancel")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                {drugSearching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={24} className="animate-spin text-brand-400" />
                    <p className="text-sm text-slate-500">{t("rx2.searchingDrugs")}</p>
                  </div>
                ) : drugResults.length > 0 ? (
                  <DrugSearchResults
                    results={drugResults}
                    onSelect={addDrug}
                    controlInfo={cfg.phytoOnly ? () => null : controlInfo}
                    className="max-h-[60vh]"
                  />
                ) : drugSearchDone ? (
                  <p className="text-sm text-slate-500 text-center py-8 px-4 border border-slate-100 rounded-xl bg-slate-50">
                    {t("rx2.noDrugsFound")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HUB VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.subtitle")}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-brand-500/20">
          <Plus size={16} /> {t("rx.new")}
        </button>
      </div>

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
        <button onClick={openCreate}
          className="text-left p-4 rounded-2xl border border-accent-100 bg-gradient-to-br from-brand-50 to-accent-50/40 hover:border-accent-200 transition">
          <Pill size={20} className="text-accent-500 mb-2" />
          <p className="font-semibold text-brand-900 text-sm">{t("rx.createAction")}</p>
          <p className="text-xs text-brand-500/80 mt-0.5">{cfg.phytoOnly ? t("rx.addPhytotherapy") : t("rx.createActionDesc")}</p>
        </button>
        {!cfg.prescriptionsOnly && (
          <>
        <button onClick={openExamCreate}
          className="text-left p-4 rounded-2xl border border-brand-100 bg-white hover:bg-brand-50/40 transition">
          <FlaskConical size={20} className="text-brand-500 mb-2" />
          <p className="font-semibold text-slate-800 text-sm">{t("rx.examAction")}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("rx.examActionDesc")}</p>
        </button>
        <button onClick={openDocumentCreate}
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
          <button key={f} onClick={() => { setListFilter(f); setShowAllHistory(true); }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition ${
              listFilter === f ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {t(f === "all" ? "rx.filterAll" : f === "prescription" ? "rx.filterPrescription" : f === "exam" ? "rx.filterExam" : "rx.filterDocument")}
          </button>
        ))}
      </div>
      )}

      {/* Recent carousel */}
      {!loading && !showAllHistory && (recentPrescriptions.length > 0 || recentClinical.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">{t("rx.recent")}</h2>
            <button onClick={() => setShowAllHistory(true)} className="text-xs font-semibold text-brand-500 hover:text-brand-700">
              {t("rx.showAll")}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {recentPrescriptions.map((p) => {
              const meds = p.medications as MedItem[];
              const patientName = p.document?.patient
                ? `${p.document.patient.firstName} ${p.document.patient.lastName}` : t("rx.patient");
              return (
                <div key={`rx-${p.id}`} onClick={() => openReuse(p)}
                  className="snap-start shrink-0 w-64 bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-200 transition cursor-pointer">
                  <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{t("rx.kindPrescription")}</span>
                  <p className="text-xs text-slate-400 mt-2">{new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-1 truncate">{patientName}</p>
                  <ol className="mt-2 space-y-0.5">
                    {meds.slice(0, 2).map((m, i) => (
                      <li key={i} className="text-xs text-slate-500 truncate">{i + 1}. {m.name}</li>
                    ))}
                  </ol>
                  <button onClick={(e) => { e.stopPropagation(); openReuse(p); }}
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
                <div key={`doc-${d.id}`} onClick={() => openReuseClinical(d)}
                  className="snap-start shrink-0 w-64 bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-200 transition cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {isExamDocType(d.type) ? t("rx.kindExam") : t("rx.kindDocument")}
                  </span>
                  <p className="text-xs text-slate-400 mt-2">{new Date(d.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-1 truncate">{d.title}</p>
                  <p className="text-xs text-slate-500 truncate">{patientName}</p>
                  <button onClick={(e) => { e.stopPropagation(); openReuseClinical(d); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-brand-500 bg-brand-50 py-1.5 rounded-lg">
                    <Copy size={12} /> {t("rx.reuse")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + full list */}
      {(showAllHistory || (recentPrescriptions.length === 0 && recentClinical.length === 0)) && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("rx.search")} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          {showAllHistory && (
            <button onClick={() => setShowAllHistory(false)} className="text-xs text-slate-500 hover:text-brand-500 flex items-center gap-1">
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
              onReuse={() => openReuse(p)}
              onSign={() => signPrescription(p)}
              onPdfError={(msg) => toast.error(msg)}
              onRefresh={fetchPrescriptions}
              apiBase={cfg.apiBase}
              hideSign={cfg.skipDigitalSign}
            />
          ))}
          {showClinicalList && filteredClinical.map((d) => (
            <ClinicalDocCard
              key={d.id} d={d} locale={locale} t={t}
              onReuse={() => openReuseClinical(d)}
              onSign={() => signClinicalDoc(d)}
              onPdfError={(msg) => toast.error(msg)}
              onRefresh={fetchAll}
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
        <EmissionsSignModal target={signTarget} signConfig={signConfig} deliverAfter onClose={() => setSignTarget(null)} />
      )}
    </div>
  );
}
