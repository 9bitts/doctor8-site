"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// Memed-style prescription UI: reuse, manual add, recent carousel.

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Plus, Trash2, FileText, Download, Loader2, CheckCircle2, Search,
  AlertCircle, ChevronRight, AlertTriangle, PenLine, Pill, ArrowLeft, Copy,
  Clock, User, FlaskConical, ScrollText, LayoutTemplate, BookmarkPlus,
} from "lucide-react";
import { PatientNoAccountPanel } from "@/components/professional/emissions/PatientNoAccountPanel";
import { EmissionsSignModal, RX_STYLES, type SignTarget, type EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import { EmissionPostSaveFlow, type SavedEmission } from "@/components/professional/emissions/EmissionPostSaveFlow";
import WhatsappDeliverButton from "@/components/professional/emissions/WhatsappDeliverButton";
import { ExamCreateView } from "@/components/professional/emissions/ExamCreateView";
import { DocumentCreateView } from "@/components/professional/emissions/DocumentCreateView";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import { fetchChartById, readChartDeepLink } from "@/lib/video-chart-nav";
import type { Chart } from "@/components/professional/emissions/types";
import { DRUG_COUNTRIES, type DrugCountryCode } from "@/lib/drug-countries";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

type ImportablePatient = {
  patientProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: true;
  source: "appointment" | "shared" | "email" | "platform";
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
  categoryName?: string | null;
  document?: { patient?: { firstName: string; lastName: string } | null };
}

type View = "hub" | "prescription" | "exam" | "document";
type ListFilter = "all" | "prescription" | "exam" | "document";

interface Drug {
  id: string; name: string; activeIngredient: string; presentation: string;
  manufacturer: string | null; country: string; category: string | null;
  controlled: boolean; prescriptionType: string | null;
}
interface MedItem {
  name: string; dosage: string; frequency: string; duration: string; instructions: string;
  presentation?: string; controlled?: boolean; prescriptionType?: string | null;
}
interface Prescription {
  id: string; createdAt: string; validUntil?: string;
  instructions?: string; patientRecordId?: string | null;
  digitalSignature?: string | null;
  signatureStatus?: string | null;
  whatsappNotifyStatus?: string | null;
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

function emissionShareUrl(kind: EmissionKind): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://doctor8.app";
  if (kind === "prescription") return `${base}/patient/prescriptions`;
  return `${base}/patient/documents`;
}

function PrescriptionCard({
  p, locale, t, onReuse, onSign,
}: {
  p: Prescription; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void;
}) {
  const meds = p.medications as MedItem[];
  const signed = p.signatureStatus === "SIGNED";
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
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onReuse}
            className="flex items-center justify-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Copy size={13} /> {t("rx.reuse")}
          </button>
          {!signed && (
            <button onClick={onSign}
              className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">
              <PenLine size={13} /> {t("rx.sign")}
            </button>
          )}
          <a href={`/api/professional/prescriptions/${p.id}/pdf`} target="_blank"
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Download size={13} /> {t("rx.downloadPDF")}
          </a>
          {signed && (
            <WhatsappDeliverButton
              kind="prescription"
              id={p.id}
              patientName={patientName}
              shareUrl={emissionShareUrl("prescription")}
              t={t}
              defaultMessage={t("rx.flow.whatsappMessage")}
              initialStatus={p.whatsappNotifyStatus}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ClinicalDocCard({
  d, locale, t, onReuse, onSign,
}: {
  d: ClinicalDocument; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void;
}) {
  const signed = d.signatureStatus === "SIGNED";
  const patientName = d.document?.patient
    ? `${d.document.patient.firstName} ${d.document.patient.lastName}`
    : t("rx.patient");
  const kindLabel = isExamDocType(d.type) ? t("rx.kindExam") : t("rx.kindDocument");
  const pdfUrl = `/api/professional/documents/${d.id}/pdf`;

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
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onReuse}
            className="flex items-center justify-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Copy size={13} /> {t("rx.reuse")}
          </button>
          {!signed && (
            <button onClick={onSign}
              className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">
              <PenLine size={13} /> {t("rx.sign")}
            </button>
          )}
          <a href={pdfUrl} target="_blank"
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Download size={13} /> {t("rx.downloadPDF")}
          </a>
          {signed && (
            <WhatsappDeliverButton
              kind={emissionKindFromDoc(d.type)}
              id={d.id}
              patientName={patientName}
              shareUrl={emissionShareUrl(emissionKindFromDoc(d.type))}
              t={t}
              defaultMessage={t("rx.flow.whatsappMessage")}
              initialStatus={d.whatsappNotifyStatus}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const { t, lang } = useI18n();
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
  const [postSaveStep, setPostSaveStep] = useState<"choose" | "success">("choose");
  const [postSaveShareUrl, setPostSaveShareUrl] = useState("");

  const [charts, setCharts] = useState<Chart[]>([]);
  const [importablePatients, setImportablePatients] = useState<ImportablePatient[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [importingPatientId, setImportingPatientId] = useState<string | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const patientSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugCountry, setDrugCountry] = useState<DrugCountryCode>("BR");
  const drugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [medications, setMedications] = useState<MedItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  const [signConfig, setSignConfig] = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signResult, setSignResult] = useState<string | null>(null);

  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lockPatient, setLockPatient] = useState(false);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    loadSignConfig();
    void loadCharts();
    const params = new URLSearchParams(window.location.search);
    const { patientRecordId, returnUrl, view: viewParam } = readChartDeepLink();

    if (returnUrl) setConsultReturnUrl(returnUrl);
    if (patientRecordId && returnUrl) setLockPatient(true);

    if (patientRecordId) {
      (async () => {
        await loadCharts();
        const chart = await fetchChartById(patientRecordId);
        if (!chart) return;
        setSelectedPatient(chart as Chart);
        setReusePatient(chart as Chart);
        const v = viewParam as View | null;
        if (v === "prescription" || v === "exam" || v === "document") {
          setView(v);
        } else {
          setView("prescription");
        }
      })();
    }

    const sign = params.get("sign");
    const flow = params.get("flow");
    const kind = params.get("kind") as EmissionKind | null;
    const id = params.get("id");

    if (flow === "deliver" && sign === "success" && kind && id) {
      (async () => {
        const deliverKind = kind === "prescription" ? "prescription"
          : kind === "exam" ? "exam" : "document";
        try {
          const res = await fetch("/api/professional/emissions/deliver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: deliverKind, id, sendWhatsApp: true }),
          });
          const data = await res.json();
          if (res.ok) {
            setSavedEmission({
              kind,
              id,
              label: "",
              patient: {
                id: data.patientRecordId || "",
                firstName: data.patient?.firstName || "",
                lastName: data.patient?.lastName || "",
                email: data.patient?.email || null,
                hasAccount: !!data.patient?.hasAccount,
              },
            });
            setPostSaveStep("success");
            setPostSaveShareUrl(data.shareUrl || "");
            fetchAll();
          }
        } catch { /* ignore */ }
        window.history.replaceState({}, "", window.location.pathname);
      })();
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

  async function fetchAll() {
    setLoading(true);
    try {
      const [rxRes, docRes, tplRes] = await Promise.all([
        fetch("/api/professional/prescriptions"),
        fetch("/api/professional/documents/issued"),
        fetch("/api/professional/templates/prescriptions"),
      ]);
      const rxData = await rxRes.json();
      const docData = await docRes.json();
      const tplData = await tplRes.json();
      setPrescriptions(rxData.prescriptions || []);
      setClinicalDocs(docData.documents || []);
      if (tplRes.ok) setRxTemplates(tplData.templates || []);
    } finally { setLoading(false); }
  }

  async function fetchPrescriptions() { await fetchAll(); }

  async function loadSignConfig() {
    try {
      const res = await fetch("/api/professional/digital-sign");
      setSignConfig(await res.json());
    } catch { /* ignore */ }
  }

  async function searchPatients(q: string) {
    setChartsLoading(true);
    try {
      const res = await fetch(`/api/professional/records/search?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (res.ok) {
        setCharts(d.records || []);
        setImportablePatients(d.importable || []);
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
      const res = await fetch("/api/professional/records/import", {
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
        setPatientQuery("");
        setPatientPickerOpen(false);
        await searchPatients("");
      }
    } catch { /* ignore */ }
    finally { setImportingPatientId(null); }
  }

  function resetForm() {
    setSelectedPatient(null); setPatientQuery(""); setImportablePatients([]); setDrugQuery("");
    setDrugResults([]); setDrugCountry("BR"); setMedications([]);
    setInstructions(""); setValidDays(30); setFormError("");
    setReuseSource(null);
    setSavedEmission(null);
    setPostSaveStep("choose");
    setPostSaveShareUrl("");
  }

  function handleEmissionSaved(emission: SavedEmission) {
    setSavedEmission(emission);
    setPostSaveStep("choose");
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
    const recordsRes = await fetch("/api/professional/records");
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
    fetchAll();
  }

  function signPrescription(p: Prescription) {
    const label = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
      : t("rx.patient");
    setSignTarget({ kind: "prescription", id: p.id, label });
  }

  function signClinicalDoc(d: ClinicalDocument) {
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

    const recordsRes = await fetch("/api/professional/records");
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

  useEffect(() => {
    if (drugDebounce.current) clearTimeout(drugDebounce.current);
    const q = drugQuery.trim();
    if (q.length < 2) { setDrugResults([]); setDrugSearching(false); return; }
    setDrugSearching(true);
    drugDebounce.current = setTimeout(async () => {
      try {
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}&country=${drugCountry}`;
        const res = await fetch(url);
        const d = await res.json();
        setDrugResults(d.drugs || []);
      } catch { setDrugResults([]); }
      finally { setDrugSearching(false); }
    }, 300);
    return () => { if (drugDebounce.current) clearTimeout(drugDebounce.current); };
  }, [drugQuery, drugCountry]);

  function addDrug(drug: Drug) {
    setMedications((prev) => [...prev, {
      name: `${drug.name}${drug.activeIngredient ? ` (${drug.activeIngredient})` : ""}`,
      dosage: "", frequency: "", duration: "", instructions: "",
      presentation: drug.presentation, controlled: drug.controlled, prescriptionType: drug.prescriptionType,
    }]);
    setDrugQuery(""); setDrugResults([]);
  }

  function addManual() {
    const name = drugQuery.trim();
    setMedications((prev) => [...prev, {
      name: name || "",
      dosage: "", frequency: "", duration: "", instructions: "",
    }]);
    setDrugQuery(""); setDrugResults([]);
  }

  function removeMedication(index: number) { setMedications((prev) => prev.filter((_, i) => i !== index)); }
  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function applyRxTemplate(tpl: RxTemplate) {
    setMedications((tpl.medications as MedItem[]).map((m) => ({ ...m })));
    setInstructions(tpl.instructions || "");
    setValidDays(tpl.validDays || 30);
    setReuseSource(null);
  }

  async function saveAsRxTemplate() {
    if (medications.length === 0 || medications.some((m) => !m.name.trim() || !m.dosage || !m.frequency)) {
      setFormError(t("rx2.needMeds"));
      return;
    }
    const name = window.prompt(t("tmpl.rxNamePrompt"));
    if (!name?.trim()) return;
    setSavingTemplate(true);
    setFormError("");
    try {
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(), dosage: m.dosage, frequency: m.frequency,
        duration: m.duration, instructions: m.instructions,
      }));
      const res = await fetch("/api/professional/templates/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          medications: cleanMeds,
          instructions,
          validDays,
        }),
      });
      const data = await res.json();
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
    if (!selectedPatient) { setFormError(t("rx2.needPatient")); return; }
    if (medications.length === 0 || medications.some((m) => !m.name.trim() || !m.dosage || !m.frequency)) {
      setFormError(t("rx2.needMeds")); return;
    }
    setSaving(true);
    try {
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(), dosage: m.dosage, frequency: m.frequency,
        duration: m.duration, instructions: m.instructions,
      }));
      const res = await fetch("/api/professional/prescriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientRecordId: selectedPatient.id, medications: cleanMeds, instructions, validDays }),
      });
      if (res.ok) {
        const data = await res.json();
        handleEmissionSaved({
          kind: "prescription",
          id: data.prescriptionId,
          patient: selectedPatient,
          label: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        });
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
          initialPatient={reusePatient}
          lockPatient={lockPatient}
          initialItems={reuseClinical?.examItems || []}
          initialNotes={reuseClinical?.examNotes || ""}
          initialCid={reuseClinical?.cid || ""}
          initialTitle={reuseClinical?.title || ""}
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
          initialPatient={reusePatient}
          lockPatient={lockPatient}
          initialTitle={reuseClinical?.title || ""}
          initialBody={reuseClinical?.content || ""}
          initialType={reuseClinical?.type || "CERTIFICATE"}
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
                      ) : charts.length === 0 && importablePatients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 space-y-1">
                          <p>{t("rx2.noPatientFound")}</p>
                          {patientQuery.trim().length > 0 && (
                            <>
                              <p className="text-xs text-slate-400">{t("rx2.noPatientHint")}</p>
                              {!patientQuery.includes("@") && (
                                <p className="text-xs text-slate-400">{t("rx2.searchByEmailHint")}</p>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {charts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={keepFocusOnPointerDown}
                              onClick={() => { setSelectedPatient(c); setPatientPickerOpen(false); setPatientQuery(""); }}
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
                          {importablePatients.map((item) => (
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

            {rxTemplates.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <LayoutTemplate size={16} className="text-brand-500" /> {t("tmpl.savedRxTemplates")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rxTemplates.map((tpl) => (
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
            )}

            {/* Add item card */}
            <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4 ${drugQuery.trim().length >= 2 && drugResults.length > 0 ? "relative z-50" : ""}`}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">{t("rx2.addItem")}</label>
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
              </div>

              <div className="relative">
                <Pill size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                <input type="text" value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)}
                  placeholder={t("rx2.searchDrug")} className="rx-inp rx-inp-pl-10" />
                {drugSearching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>

              {/* Always visible manual add */}
              <button type="button" onClick={addManual}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-600 font-semibold text-sm transition">
                <Plus size={16} /> {t("rx2.addManual")}
              </button>
              <p className="text-xs text-slate-400 text-center -mt-2">{t("rx.manualAlways")}</p>

              {drugQuery.trim().length >= 2 && drugResults.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {drugResults.map((drug) => {
                    const ci = controlInfo(drug.prescriptionType);
                    return (
                      <button
                        key={drug.id}
                        type="button"
                        onMouseDown={keepFocusOnPointerDown}
                        onClick={() => addDrug(drug)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-50 transition text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                            {drug.name}
                            {drug.controlled && ci && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ci.tarja === "preta" ? "bg-slate-800 text-white" : "bg-red-100 text-red-600"}`}>
                                {ci.label}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{drug.activeIngredient}</p>
                          <p className="text-xs text-slate-400">{drug.presentation}</p>
                        </div>
                        <Plus size={16} className="text-brand-500 shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prescription items */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <label className="text-sm font-semibold text-slate-800">{t("rx2.selectedMeds")}</label>
              {medications.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Pill size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t("rx2.noMeds")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med, index) => {
                    const ci = controlInfo(med.prescriptionType);
                    return (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            <label className="text-xs font-medium text-slate-600">{t("rx2.manualName")}</label>
                            <input type="text" value={med.name}
                              onChange={(e) => updateMedication(index, "name", e.target.value)}
                              placeholder={t("rx2.manualNamePlaceholder")} className="rx-inp-sm" />
                            {med.controlled && ci && (
                              <p className="text-[11px] text-red-700 bg-red-50 rounded-md px-2 py-1 inline-flex items-center gap-1">
                                <AlertCircle size={11} />{ci.receita}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removeMedication(index)} className="text-red-400 hover:text-red-600 shrink-0 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.dosageLabel")} *</label>
                            <input type="text" value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder={t("rx.medDosagePlaceholder")} className="rx-inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.frequencyLabel")} *</label>
                            <select value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} className="rx-inp-sm">
                              <option value="">{t("med.freqSelect")}</option>
                              <option value="Once daily">{t("med.freqOnce")}</option>
                              <option value="Twice daily">{t("med.freqTwice")}</option>
                              <option value="Three times daily">{t("med.freqThree")}</option>
                              <option value="Every 8 hours">{t("med.freq8h")}</option>
                              <option value="Every 12 hours">{t("med.freq12h")}</option>
                              <option value="As needed">{t("med.freqAsNeeded")}</option>
                              <option value="Weekly">{t("med.freqWeekly")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.durationLabel")}</label>
                            <input type="text" value={med.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} placeholder={t("rx.medDurationPlaceholder")} className="rx-inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.instructionsLabel")}</label>
                            <input type="text" value={med.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} placeholder={t("rx.medInstructionsPlaceholder")} className="rx-inp-sm" />
                          </div>
                        </div>
                      </div>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 z-30">
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

      {signResult === "success" && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-700 font-medium">Documento assinado com sucesso! O PDF assinado já está disponível.</p>
        </div>
      )}
      {signResult === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">Assinatura cancelada.</div>
      )}
      {signResult === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">Erro ao assinar. Tente novamente.</div>
      )}

      {signConfig && !signConfig.configured && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
          <PenLine size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-700">{t("digSign.bannerTitle")}</p>
            <p className="text-xs text-brand-500 mt-1">{t("digSign.bannerDesc")}</p>
          </div>
          <a href="/professional/account#digital-sign"
            className="text-xs font-semibold text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition shrink-0">
            {t("digSign.configure")}
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={openCreate}
          className="text-left p-4 rounded-2xl border border-accent-100 bg-gradient-to-br from-brand-50 to-accent-50/40 hover:border-accent-200 transition">
          <Pill size={20} className="text-accent-500 mb-2" />
          <p className="font-semibold text-brand-900 text-sm">{t("rx.createAction")}</p>
          <p className="text-xs text-brand-500/80 mt-0.5">{t("rx.createActionDesc")}</p>
        </button>
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
      </div>

      {/* Filter tabs */}
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
            />
          ))}
          {showClinicalList && filteredClinical.map((d) => (
            <ClinicalDocCard
              key={d.id} d={d} locale={locale} t={t}
              onReuse={() => openReuseClinical(d)}
              onSign={() => signClinicalDoc(d)}
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

      {signTarget && (
        <EmissionsSignModal target={signTarget} signConfig={signConfig} onClose={() => setSignTarget(null)} />
      )}
    </div>
  );
}
