"use client";

// src/app/(dashboard)/professional/patients/[id]/RecordDetailClient.tsx
// Chart detail + add clinical record (title + text + optional file upload to S3).
// Phase 4B: the category selector is now dynamic (grouped categories from the DB).
// Etapa 3c: edit the chart's email (only when no account) + resend prescription invite.
// P1-b: edit the chart's registration data (birth, sex, cpf, address) used by the prescription.
// P2: "Diagnóstico / Título" label (trilíngue) + botão WhatsApp no cabeçalho da ficha.

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Plus, X, FileText, CheckCircle2, AlertCircle, AlertTriangle,
  Mail, Loader2, Pencil, Send, MapPin, MessageCircle, ExternalLink,
  RotateCw, Download, Video,
  Activity, Stethoscope, Syringe, LineChart, Grid3X3, Ear, Utensils, HeartPulse, Pill, FileCheck, Clock, BookMarked,
} from "lucide-react";
import SendEducationModal from "@/components/professional/library/SendEducationModal";
import { EmissionsSignModal, type EmissionKind, type SignTarget } from "@/components/professional/emissions/EmissionsSignModal";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import ReferralPanel from "@/components/professional/ReferralPanel";
import PsychologyChartAuditPanel from "@/components/psychologist/PsychologyChartAuditPanel";
import PatientChartTags, { type ChartTag } from "@/components/professional/PatientChartTags";
import MetricsFormFields, { emptyMetrics } from "@/components/professional/MetricsFormFields";
import MetricsEvolutionPanel from "@/components/professional/MetricsEvolutionPanel";
import DiagnosesPanel from "@/components/professional/DiagnosesPanel";
import VaccinationPanel from "@/components/professional/VaccinationPanel";
import GrowthCurvePanel from "@/components/professional/GrowthCurvePanel";
import OdontogramPanel from "@/components/professional/OdontogramPanel";
import AudiogramPanel from "@/components/professional/AudiogramPanel";
import ClinicalCalculators from "@/components/professional/ClinicalCalculators";
import NutritionPatientChartPanel from "@/components/nutritionist/NutritionPatientChartPanel";
import NursePatientChartPanel from "@/components/nurse/NursePatientChartPanel";
import PharmacistPatientChartPanel from "@/components/pharmacist/PharmacistPatientChartPanel";
import ChartClinicalActions from "@/components/professional/ChartClinicalActions";
import ChartActivityTimeline from "@/components/professional/ChartActivityTimeline";
import CategorySearchSelect from "@/components/professional/CategorySearchSelect";
import DoctorClinicalHub, {
  tabToDoctorHubSection,
  type DoctorHubSectionId,
} from "@/components/professional/DoctorClinicalHub";
import PsychologistClinicalHub, {
  tabToPsychologistHubSection,
  type PsychologistHubSectionId,
} from "@/components/psychologist/PsychologistClinicalHub";
import ChartDocsList from "@/components/professional/ChartDocsList";
import PatientExamResultsModal from "@/components/professional/PatientExamResultsModal";
import { buildEmissionReuseUrl } from "@/lib/emission-reuse-nav";
import { openAuthenticatedPdf } from "@/lib/open-url-safely";
import { uploadFileToApi } from "@/lib/upload-client";
import {
  RecordTimelineFilters,
  PinnedAnamnesisCard,
  AnamnesisPromptBanner,
} from "@/components/professional/PatientRecordTimeline";
import { consumeVoiceFormPrefill } from "@/lib/voice-assistant/prefill-storage";
import { VOICE_FORM_PREFILL_EVENT } from "@/lib/voice-assistant/types";
import { VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { ChartEvolutionPrefill } from "@/lib/voice-assistant/types";
import {
  mapProfessionalPathToPortal,
  professionalPatientsHref,
} from "@/lib/psychologist-portal";
import { chartActionUrl } from "@/lib/video-chart-nav";
import { hasAnyMetric, type ClinicalMetricsInput } from "@/lib/clinical-metrics";
import {
  type ClinicalRecordKind,
  type RecordTimelineFilter,
  matchesTimelineFilter,
  matchesPsychologyCfpDocument,
  suggestRecordKind,
  inferRecordKindFromCategory,
  findPinnedAnamnesis,
} from "@/lib/record-kind";
import {
  clearRecordDraft,
  hasRecordDraft,
  isRecordDraftEmpty,
  loadRecordDraft,
  saveRecordDraft,
  type ClinicalRecordDraft,
} from "@/lib/record-draft";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getCategoryLabel } from "@/lib/category-i18n";
import {
  buildRecordCopyText, formatRecordContentForDisplay, parseRecordContent,
} from "@/lib/record-content";
import { isImageFile, rotateImageFile } from "@/lib/image-rotate";
import { waPhoneDigits } from "@/lib/wa-phone";
import { computeMissingForRx } from "@/lib/patient-rx-requirements";
import {
  extendSessionForWrite,
  isAuthFailureStatus,
  redirectToLoginAfterAuthFailure,
} from "@/lib/session-extend-client";
import type { ChartActivityEvent } from "@/lib/chart-activity-timeline";

interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  hasAccount: boolean;
  linkedUserId: string | null;
  avatarUrl: string | null;
  // P1-b registration data
  dateOfBirth: string;
  sex: string;
  cpf: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  missingForRx?: string[];
  profileAllergies?: string | null;
}
interface Doc {
  id: string;
  type: string;
  recordKind?: ClinicalRecordKind | string;
  categoryName: string | null;
  categoryGroup: string | null;
  title: string;
  content: string | null;
  hasFile: boolean;
  attachmentCount?: number;
  createdAt: string;
  sourceDocumentId?: string | null;
  canEdit?: boolean;
  prescriptionId?: string | null;
  signatureStatus?: string | null;
  whatsappNotifyStatus?: string | null;
  patientNotifiedAt?: boolean;
  medications?: { name: string; dosage?: string; frequency?: string }[] | null;
}

function emissionKindFromDocType(type: string): EmissionKind | null {
  if (type === "PRESCRIPTION") return "prescription";
  if (type === "EXAM_REQUEST" || type === "EXAM_RESULT") return "exam";
  if (["CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER"].includes(type)) return "document";
  return null;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  groupName: string;
  icon: string | null;
  legacyType: string | null;
}
interface CategoryGroup {
  group: string;
  items: CategoryItem[];
}

function findCategoryIdByLegacyType(groups: CategoryGroup[], legacyType: string): string {
  for (const g of groups) {
    const found = g.items.find((c) => c.legacyType === legacyType);
    if (found) return found.id;
  }
  return "";
}

function normCategoryText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function findCategoryIdByKeyword(
  items: { id: string; slug: string; name: string; label: string }[],
  keywords: string[],
): string {
  for (const c of items) {
    const hay = normCategoryText(`${c.slug} ${c.name} ${c.label}`);
    if (keywords.some((k) => hay.includes(normCategoryText(k)))) return c.id;
  }
  return "";
}

function firstSortedCategoryId(
  items: { id: string; label: string }[],
): string {
  return items[0]?.id ?? "";
}

// Fallback labels for legacy `type` (records created before dynamic categories).
const LEGACY_KEYS: Record<string, string> = {
  PRESCRIPTION: "doctype.PRESCRIPTION",
  EXAM_REQUEST: "doctype.EXAM_REQUEST",
  EXAM_RESULT: "doctype.EXAM_RESULT",
  CERTIFICATE: "doctype.CERTIFICATE",
  REFERRAL: "doctype.REFERRAL",
  CLINICAL_NOTE: "doctype.CLINICAL_NOTE",
  OTHER: "doctype.OTHER",
};

// Clean phone for wa.me — uses chart country when available.
function waPhone(raw: string, country?: string | null): string {
  return waPhoneDigits(raw, country);
}

export default function RecordDetailClient({
  chart,
  initialDocuments,
  initialActivityTimeline = [],
  initialTags = [],
  chartAccess = "owner",
  readOnly = false,
  ownerName,
}: {
  chart: Chart;
  initialDocuments: Doc[];
  initialActivityTimeline?: ChartActivityEvent[];
  initialTags?: ChartTag[];
  chartAccess?: "owner" | "edit" | "view";
  readOnly?: boolean;
  ownerName?: string;
}) {
  const isOwner = chartAccess === "owner";
  const canEdit = !readOnly && chartAccess !== "view";
  const pathname = usePathname();
  const isDoctorPortal = pathname.startsWith("/professional");
  const isNutritionistPortal = pathname.startsWith("/nutricionista");
  const isPsychologistPortal = pathname.startsWith("/psychologist");
  const isNursePortal = pathname.startsWith("/enfermeiro");
  const isPharmacistPortal = pathname.startsWith("/farmaceutico");
  const portalBase = mapProfessionalPathToPortal(pathname, "/professional");
  const prescriptionsPath = mapProfessionalPathToPortal(pathname, "/professional/prescriptions");
  const chartReturnUrl = professionalPatientsHref(pathname, chart.id);
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id ?? "";
  const { lang, t } = useI18n();
  const toast = useToast();
  const searchParams = useSearchParams();
  const consultReturnUrl = searchParams.get("returnUrl");
  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
  const [chartTab, setChartTab] = useState<"activity" | "records" | "evolution" | "diagnoses" | "vaccines" | "growth" | "dental" | "audio" | "nutrition" | "nursing" | "pharmacy">("activity");
  const [doctorHubOpenId, setDoctorHubOpenId] = useState<DoctorHubSectionId | null>("anamnesis");
  const [psychHubOpenId, setPsychHubOpenId] = useState<PsychologistHubSectionId | null>("anamnesis");
  const [recordFilter, setRecordFilter] = useState<RecordTimelineFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rotating, setRotating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Chart contact (email) state — Etapa 3c
  const [chartEmail, setChartEmail] = useState<string | null>(chart.email);
  const [hasAccount, setHasAccount] = useState<boolean>(chart.hasAccount);
  const [hasConversation, setHasConversation] = useState<boolean>(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(chart.email || "");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<{
    status: string;
    sentAt: string;
    linkedAt: string | null;
    email: string;
  } | null>(null);

  // P1-b: registration data state
  const [reg, setReg] = useState({
    dateOfBirth: chart.dateOfBirth,
    sex: chart.sex,
    cpf: chart.cpf,
    addressLine1: chart.addressLine1,
    city: chart.city,
    state: chart.state,
    country: chart.country || "BR",
    zipCode: chart.zipCode,
    phone: chart.phone || "",
  });
  const [editingReg, setEditingReg] = useState(false);
  const [regDraft, setRegDraft] = useState(reg);
  const [regSaving, setRegSaving] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);

  const [displayFirstName, setDisplayFirstName] = useState(chart.firstName);
  const [displayLastName, setDisplayLastName] = useState(chart.lastName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState({ firstName: chart.firstName, lastName: chart.lastName });
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [chartNotes, setChartNotes] = useState(chart.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(chart.notes || "");
  const [notesSaving, setNotesSaving] = useState(false);

  // Dynamic categories
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Share state, keyed by document id
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showExamResultsModal, setShowExamResultsModal] = useState(false);
  const [signConfig, setSignConfig] = useState<{ configured: boolean; cpfMasked: string; recentAuth?: boolean } | null>(null);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);

  // Form fields
  const [categoryId, setCategoryId] = useState("");
  const [cidSelection, setCidSelection] = useState<CidSelection | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [metrics, setMetrics] = useState<ClinicalMetricsInput>(emptyMetrics());
  const [addToDiagnoses, setAddToDiagnoses] = useState(true);
  const [recordKind, setRecordKind] = useState<ClinicalRecordKind>("EVOLUTION");
  const [pendingDraft, setPendingDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [voicePrefillActive, setVoicePrefillActive] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const applyChartVoicePrefill = () => {
      const payload = consumeVoiceFormPrefill("chart_evolution", chart.id);
      if (!payload) return;
      const d = payload.data as ChartEvolutionPrefill;
      setTitle(d.title || (lang === "es" ? "Evolución — asistente de voz" : lang === "en" ? "Evolution — voice assistant" : "Evolução — assistente de voz"));
      setContent(d.draft);
      setRecordKind("EVOLUTION");
      setChartTab("evolution");
      setShowForm(true);
      setVoicePrefillActive(true);
    };
    applyChartVoicePrefill();
    window.addEventListener(VOICE_FORM_PREFILL_EVENT, applyChartVoicePrefill);
    return () => window.removeEventListener(VOICE_FORM_PREFILL_EVENT, applyChartVoicePrefill);
  }, [chart.id, lang]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (!active) return;
        const gs: CategoryGroup[] = data.groups || [];
        setGroups(gs);
      } catch {
        // leave empty; form will show a message
      }
      if (active) setCategoriesLoading(false);

      // Check if conversation exists with this patient
      if (chart.linkedUserId) {
        try {
          const res = await fetch(`/api/messages?with=${chart.linkedUserId}`);
          const data = await res.json();
          if (active && data.messages?.length > 0) setHasConversation(true);
        } catch { /* ignore */ }
      }

      if (!chart.hasAccount) {
        try {
          const res = await fetch(`/api/professional/records/${chart.id}/invite`);
          const data = await res.json();
          if (active && data.invite) setInviteStatus(data.invite);
        } catch { /* ignore */ }
      }

      try {
        const res = await fetch("/api/professional/digital-sign");
        if (active) setSignConfig(await res.json());
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    setPendingDraft(hasRecordDraft(userId, chart.id));
  }, [chart.id, userId]);

  useEffect(() => {
    if (searchParams.get("viewExamResults") === "1") {
      openExamResultsView();
      return;
    }
    if (searchParams.get("newRecord") !== "1" || categoriesLoading) return;
    const docType = searchParams.get("docType");
    if (docType === "EXAM_RESULT") {
      openExamResultsView();
    } else {
      openNewRecordForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialDocuments, categoriesLoading, groups]);

  const sortedCategories = useMemo(() => {
    const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
    const items = groups.flatMap((g) =>
      g.items.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        legacyType: c.legacyType,
        label: getCategoryLabel(lang, { slug: c.slug, name: c.name }),
      })),
    );
    items.sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: "base" }));
    return items;
  }, [groups, lang]);

  useEffect(() => {
    const tab = searchParams.get("tab") ?? searchParams.get("view");
    const validTabs = new Set([
      "activity", "records", "evolution", "diagnoses", "vaccines", "growth", "dental", "audio",
      "nutrition", "nursing", "pharmacy",
    ]);
    if (tab && validTabs.has(tab)) {
      if (tab === "nutrition" && !isNutritionistPortal) return;
      if (tab === "nursing" && !isNursePortal) return;
      if (tab === "pharmacy" && !isPharmacistPortal) return;
      setChartTab(tab as typeof chartTab);
      if (isDoctorPortal) {
        const hub = tabToDoctorHubSection(tab);
        if (hub) setDoctorHubOpenId(hub);
      }
      if (isPsychologistPortal) {
        const hub = tabToPsychologistHubSection(tab);
        if (hub) setPsychHubOpenId(hub);
      }
    }
  }, [searchParams, isNutritionistPortal, isNursePortal, isPharmacistPortal, isDoctorPortal, isPsychologistPortal]);

  useEffect(() => {
    const recordId = searchParams.get("recordId");
    if (!recordId) return;
    setChartTab("records");
    setRecordFilter("all");
    const doc = docs.find((d) => d.id === recordId);
    if (isDoctorPortal) {
      if (doc?.recordKind === "ANAMNESIS") setDoctorHubOpenId("anamnesis");
      else if (doc && matchesTimelineFilter(doc, "prescription")) setDoctorHubOpenId("prescriptions");
      else if (doc && matchesTimelineFilter(doc, "exam")) setDoctorHubOpenId("exams");
      else if (doc && matchesTimelineFilter(doc, "report")) setDoctorHubOpenId("documents");
      else if (doc && matchesTimelineFilter(doc, "patient_shared")) setDoctorHubOpenId("patient_shared");
      else setDoctorHubOpenId("timeline");
    }
    if (isPsychologistPortal) {
      if (doc?.recordKind === "ANAMNESIS") setPsychHubOpenId("anamnesis");
      else if (doc?.recordKind === "SESSION_NOTE") setPsychHubOpenId("session_notes");
      else if (doc?.recordKind === "SCALE") setPsychHubOpenId("scales");
      else if (doc && matchesTimelineFilter(doc, "patient_shared")) setPsychHubOpenId("patient_shared");
      else if (doc && matchesPsychologyCfpDocument(doc)) setPsychHubOpenId("cfp_docs");
      else setPsychHubOpenId("timeline");
    }
    setExpandedIds((prev) => new Set(prev).add(recordId));
    const timer = setTimeout(() => {
      document.getElementById(`record-${recordId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => clearTimeout(timer);
  }, [searchParams, isDoctorPortal, isPsychologistPortal, docs]);

  useEffect(() => {
    if (!userId || editingDoc || !showForm) return;
    const draft: ClinicalRecordDraft = {
      categoryId,
      cidSelection,
      title,
      content,
      recordKind,
      metrics,
      addToDiagnoses,
    };
    if (isRecordDraftEmpty(draft)) {
      clearRecordDraft(userId, chart.id);
      setPendingDraft(false);
      return;
    }
    saveRecordDraft(userId, chart.id, draft);
    setPendingDraft(true);
  }, [
    userId,
    chart.id,
    editingDoc,
    showForm,
    categoryId,
    cidSelection,
    title,
    content,
    recordKind,
    metrics,
    addToDiagnoses,
  ]);

  function applyRecordDraft(draft: ClinicalRecordDraft) {
    if (draft.categoryId) setCategoryId(draft.categoryId);
    setCidSelection(draft.cidSelection ?? null);
    setTitle(draft.title ?? "");
    setContent(draft.content ?? "");
    setRecordKind(draft.recordKind ?? suggestRecordKind(docs));
    setMetrics(draft.metrics ?? emptyMetrics());
    setAddToDiagnoses(draft.addToDiagnoses ?? true);
    setFiles([]);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setError(null);
    setEditingDoc(null);
  }

  function insertCalcText(text: string) {
    setContent((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
  }

  function resetForm(clearDraft = false) {
    setCategoryId(firstSortedCategoryId(sortedCategories));
    setCidSelection(null);
    setTitle("");
    setContent("");
    setFiles([]);
    setMetrics(emptyMetrics());
    setAddToDiagnoses(true);
    setRecordKind(suggestRecordKind(docs));
    setImagePreview(null);
    setError(null);
    setEditingDoc(null);
    setDraftRestored(false);
    if (clearDraft) {
      clearRecordDraft(userId, chart.id);
      setPendingDraft(false);
    }
  }

  function openAnamnesisForm() {
    const draft = userId ? loadRecordDraft(userId, chart.id) : null;
    if (draft && !isRecordDraftEmpty(draft)) {
      applyRecordDraft(draft);
      setDraftRestored(true);
    } else {
      resetForm();
      const anamId = findCategoryIdByKeyword(sortedCategories, ["anamnes", "anamnese"]);
      if (anamId) setCategoryId(anamId);
    }
    setChartTab("records");
    setRecordFilter("anamnesis");
    if (isDoctorPortal) setDoctorHubOpenId("anamnesis");
    if (isPsychologistPortal) setPsychHubOpenId("anamnesis");
    setShowForm(true);
  }

  function openNewRecordForm() {
    const draft = userId ? loadRecordDraft(userId, chart.id) : null;
    if (draft && !isRecordDraftEmpty(draft)) {
      applyRecordDraft(draft);
      setDraftRestored(true);
    } else {
      resetForm();
      setRecordKind(suggestRecordKind(docs));
    }
    setShowForm(true);
  }

  function focusExamsHub() {
    setChartTab("records");
    setRecordFilter("exam");
    if (isDoctorPortal) setDoctorHubOpenId("exams");
  }

  function openExamResultsView() {
    focusExamsHub();
    setShowExamResultsModal(true);
  }

  function openExamResultForm() {
    resetForm();
    const catId =
      findCategoryIdByLegacyType(groups, "EXAM_RESULT") ||
      findCategoryIdByKeyword(sortedCategories, ["exame", "exam", "laboratorial", "sangue"]);
    if (catId) setCategoryId(catId);
    focusExamsHub();
    setShowExamResultsModal(false);
    setShowForm(true);
  }

  function openPatientExamResultInChart(docId: string) {
    setShowExamResultsModal(false);
    focusExamsHub();
    setExpandedIds((prev) => new Set(prev).add(docId));
    setTimeout(() => {
      document.getElementById(`record-${docId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  function openVitalsRecordForm() {
    const draft = userId ? loadRecordDraft(userId, chart.id) : null;
    if (draft && !isRecordDraftEmpty(draft)) {
      applyRecordDraft(draft);
      setDraftRestored(true);
    } else {
      resetForm();
      const vitalsId = findCategoryIdByKeyword(sortedCategories, [
        "sinais-vitais",
        "sinais vitais",
        "sinais",
        "vital",
        "vitais",
        "signos vitales",
        "vital signs",
      ]);
      if (vitalsId) setCategoryId(vitalsId);
      setRecordKind("EVOLUTION");
    }
    setChartTab("records");
    if (isDoctorPortal) setDoctorHubOpenId("vitals");
    setShowForm(true);
  }

  function openEditForm(doc: Doc) {
    resetForm();
    setEditingDoc(doc);
    const parsed = parseRecordContent(doc.content);
    if (parsed.cid) {
      setCidSelection({
        code: parsed.cid,
        description: parsed.cidLabel || doc.title,
      });
    }
    const titleMatch = doc.title.match(/^[^\s—-]+[\s—-]+(.+)$/);
    if (!parsed.cid && doc.title) setTitle(doc.title);
    else if (parsed.cid && titleMatch && titleMatch[1] !== parsed.cidLabel) {
      setTitle(titleMatch[1].trim());
    }
    setContent(parsed.body || parsed.notes || (parsed.items ? "" : (doc.content || "")));
    setRecordKind((doc.recordKind as ClinicalRecordKind) || "OTHER");
    setShowForm(true);
  }

  async function uploadRecordFile(f: File): Promise<string | null> {
    const up = await uploadFileToApi(f, `records/${chart.id}`);
    if (!up.ok) {
      setError(
        up.unauthorized
          ? t("docs.err.sessionExpired")
          : up.error === "FILE_TOO_LARGE"
            ? t("docs.err.fileTooLarge")
          : up.error === "UPLOAD_FAILED" || up.error === "NETWORK"
            ? t("rec.uploadFailed")
            : up.error,
      );
      return null;
    }
    return up.key;
  }

  async function handleRotateImage(direction: "left" | "right") {
    const file = files[0];
    if (!file || !isImageFile(file)) return;
    setRotating(true);
    try {
      const degrees = direction === "left" ? 270 : 90;
      const rotated = await rotateImageFile(file, degrees as 90 | 270);
      setFiles([rotated, ...files.slice(1)]);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(rotated));
    } catch {
      setError(t("rec.rotateFailed"));
    }
    setRotating(false);
  }

  function handleFilesChange(fileList: FileList | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const picked = fileList ? Array.from(fileList) : [];
    setFiles(picked);
    const firstImage = picked.find((f) => isImageFile(f));
    setImagePreview(firstImage ? URL.createObjectURL(firstImage) : null);
  }

  async function handleCopy(doc: Doc, label: string) {
    const locale = localeOf(lang);
    const text = buildRecordCopyText({
      categoryLabel: label,
      title: doc.title,
      content: doc.content,
      createdAt: doc.createdAt,
      patientName: `${chart.firstName} ${chart.lastName}`,
      locale,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  async function handlePrint(docId: string) {
    try {
      await openAuthenticatedPdf(`/api/professional/documents/${docId}/pdf`);
    } catch {
      toast.error(t("docs.err.downloadFailed"));
    }
  }

  async function patchChartRecord(
    body: Record<string, unknown>,
  ): Promise<
    | { ok: true; data: Record<string, unknown> }
    | { ok: false; error: string; authFailure?: boolean }
  > {
    await extendSessionForWrite(updateSession);
    const res = await fetch(`/api/professional/records/${chart.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (isAuthFailureStatus(res.status)) {
      return { ok: false, error: t("session.expiredOnSave"), authFailure: true };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === "string" ? data.error : t("rec.regSaveFailed"),
      };
    }
    return { ok: true, data };
  }

  function notifyAuthFailure(message: string) {
    toast.error(message);
    redirectToLoginAfterAuthFailure();
  }

  // ── Etapa 3c: save edited email ──
  async function saveEmail() {
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const result = await patchChartRecord({ email: emailDraft.trim() });
      if (!result.ok) {
        if (result.authFailure) notifyAuthFailure(result.error);
        else setEmailMsg("error:" + result.error);
      } else {
        const data = result.data;
        setChartEmail(typeof data.email === "string" ? data.email : emailDraft.trim());
        setHasAccount(!!data.hasAccount);
        setEditingEmail(false);
        if (data.hasAccount) {
          setEmailMsg("linked");
        } else if (data.email) {
          setEmailMsg("saved");
          try {
            const inviteRes = await fetch(`/api/professional/records/${chart.id}/invite`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ language: lang }),
            });
            if (inviteRes.ok) {
              setEmailMsg("invited");
              setInviteMsg("sent");
            }
          } catch { /* invite is best-effort after email save */ }
        } else {
          setEmailMsg("saved");
        }
      }
    } catch {
      setEmailMsg("error:" + t("rec.networkError"));
    }
    setEmailSaving(false);
  }

  // ── P1-b: save registration data ──
  function openRegEditor() {
    setRegDraft(reg);
    setRegMsg(null);
    setEditingReg(true);
  }
  async function saveReg() {
    setRegSaving(true);
    setRegMsg(null);
    try {
      const result = await patchChartRecord({
        dateOfBirth: regDraft.dateOfBirth,
        sex: regDraft.sex,
        cpf: regDraft.cpf,
        addressLine1: regDraft.addressLine1,
        city: regDraft.city,
        state: regDraft.state,
        country: regDraft.country,
        zipCode: regDraft.zipCode,
        phone: regDraft.phone,
      });
      if (!result.ok) {
        if (result.authFailure) notifyAuthFailure(result.error);
        else setRegMsg("error:" + result.error);
      } else {
        setReg(regDraft);
        setEditingReg(false);
        setRegMsg("saved");
        toast.success(t("rec.regSaved"));
      }
    } catch {
      setRegMsg("error:" + t("rec.networkError"));
      toast.error(t("rec.networkError"));
    }
    setRegSaving(false);
  }

  async function saveName() {
    setNameSaving(true);
    setNameMsg(null);
    try {
      const result = await patchChartRecord({
        firstName: nameDraft.firstName.trim(),
        lastName: nameDraft.lastName.trim(),
      });
      if (!result.ok) {
        if (result.authFailure) notifyAuthFailure(result.error);
        else setNameMsg("error:" + result.error);
      } else {
        setDisplayFirstName(nameDraft.firstName.trim());
        setDisplayLastName(nameDraft.lastName.trim());
        setEditingName(false);
        setNameMsg("saved");
        toast.success(t("rec.regSaved"));
      }
    } catch {
      setNameMsg("error:" + t("rec.networkError"));
    }
    setNameSaving(false);
  }

  async function saveNotes() {
    setNotesSaving(true);
    try {
      const result = await patchChartRecord({ notes: notesDraft });
      if (!result.ok) {
        if (result.authFailure) notifyAuthFailure(result.error);
        else toast.error(result.error);
      } else {
        setChartNotes(notesDraft.trim() || "");
        setEditingNotes(false);
        toast.success(t("rec.regSaved"));
      }
    } catch {
      toast.error(t("rec.networkError"));
    }
    setNotesSaving(false);
  }

  // ── Etapa 3c: resend prescription invite ──
  async function resendInvite() {
    setInviteSending(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/professional/records/${chart.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg("error:" + (typeof data.error === "string" ? data.error : t("rx3.inviteError")));
      } else {
        setInviteMsg("sent");
        if (data.invite) {
          setInviteStatus({
            status: data.invite.status,
            sentAt: data.invite.sentAt,
            linkedAt: null,
            email: data.sentTo || chartEmail || "",
          });
        }
      }
    } catch {
      setInviteMsg("error:" + t("rec.networkError"));
    }
    setInviteSending(false);
  }

  function signEmissionDoc(d: Doc) {
    const kind = emissionKindFromDocType(d.type);
    if (!kind) return;
    const emissionId = kind === "prescription" ? (d.prescriptionId || d.id) : d.id;
    setSignTarget({ kind, id: emissionId, label: d.title });
  }

  function reuseEmissionDoc(d: Doc) {
    const kind = emissionKindFromDocType(d.type);
    if (!kind) return;
    const emissionId = kind === "prescription" ? (d.prescriptionId || d.id) : d.id;
    window.location.href = buildEmissionReuseUrl(
      `${portalBase}/prescriptions`,
      chart.id,
      kind,
      emissionId,
    );
  }

  function markEmissionDelivered(docId: string) {
    setDocs((prev) => prev.map((doc) => (
      doc.id === docId ? { ...doc, patientNotifiedAt: true } : doc
    )));
  }

  async function handleShare(docId: string) {
    setSharingId(docId);
    setShareStatus((s) => ({ ...s, [docId]: "" }));
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || t("rec.updateFailed")) }));
      } else if (data.shared) {
        setShareStatus((s) => ({ ...s, [docId]: "shared" }));
      } else if (data.needsInvite) {
        setShareStatus((s) => ({ ...s, [docId]: data.hasEmail ? "needsInvite" : "noEmail" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:" + t("rec.networkError") }));
    }
    setSharingId(null);
  }

  async function handleInvite(docId: string) {
    setSharingId(docId);
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || t("rx3.inviteError")) }));
      } else if (data.invited) {
        setShareStatus((s) => ({ ...s, [docId]: "invited" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:" + t("rec.networkError") }));
    }
    setSharingId(null);
  }

  function resolveRecordTitle(fallbackTitle = ""): string {
    if (cidSelection) {
      return title.trim()
        ? `${cidSelection.code} — ${title.trim()}`
        : `${cidSelection.code} — ${cidSelection.description}`;
    }
    if (title.trim()) return title.trim();
    return fallbackTitle;
  }

  async function handleCreate() {
    if (!categoryId) {
      setError(t("rec.errCategory"));
      return;
    }
    setSaving(true);
    setError(null);

    let categoryLabel = "";
    const cat = sortedCategories.find((c) => c.id === categoryId);
    if (cat) {
      categoryLabel = cat.label;
    }
    const effectiveRecordKind = cat
      ? inferRecordKindFromCategory(
          { slug: cat.slug, name: cat.name, legacyType: cat.legacyType },
          docs,
        )
      : recordKind;
    const baseTitle = resolveRecordTitle(categoryLabel);
    if (!baseTitle) {
      setError(t("rec.errTitle"));
      setSaving(false);
      return;
    }

    try {
      const fileKeys: string[] = [];
      for (const f of files) {
        const key = await uploadRecordFile(f);
        if (!key) {
          setSaving(false);
          return;
        }
        fileKeys.push(key);
      }

      const res = await fetch("/api/professional/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: chart.id,
          categoryId,
          title: baseTitle,
          content,
          cid: cidSelection?.code || "",
          cidLabel: cidSelection?.description || "",
          addToDiagnoses,
          recordKind: effectiveRecordKind,
          ...(hasAnyMetric(metrics) ? { metrics } : {}),
          ...(fileKeys.length === 1 ? { fileKey: fileKeys[0] } : {}),
          ...(fileKeys.length > 0 ? { fileKeys } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("rec.createFailed"));
        toast.error(typeof data.error === "string" ? data.error : t("rec.createFailed"));
        setSaving(false);
        return;
      }

      setDocs((prev) => [
        {
          id: data.id,
          type: data.type,
          recordKind: data.recordKind || effectiveRecordKind,
          categoryName: data.categoryName ?? null,
          categoryGroup: null,
          title: data.title,
          content: data.content,
          hasFile: data.hasFile,
          attachmentCount: data.attachmentCount ?? (data.hasFile ? 1 : 0),
          createdAt: new Date().toISOString(),
          canEdit: true,
          sourceDocumentId: null,
        },
        ...prev,
      ]);
      resetForm(true);
      setShowForm(false);
      toast.success(t("toast.saveSuccess"));
    } catch {
      setError(t("rec.networkError"));
      toast.error(t("rec.networkError"));
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingDoc) return;
    setSaving(true);
    setError(null);

    const recordTitle = resolveRecordTitle(editingDoc.title);

    try {
      const appendFileKeys: string[] = [];
      for (const f of files) {
        const key = await uploadRecordFile(f);
        if (!key) {
          setSaving(false);
          return;
        }
        appendFileKeys.push(key);
      }

      const res = await fetch(`/api/professional/documents/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recordTitle,
          content,
          cid: cidSelection?.code || "",
          cidLabel: cidSelection?.description || "",
          recordKind,
          ...(appendFileKeys.length ? { appendFileKeys } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("rec.updateFailed"));
        toast.error(typeof data.error === "string" ? data.error : t("rec.updateFailed"));
        setSaving(false);
        return;
      }

      setDocs((prev) => prev.map((d) => (d.id === editingDoc.id ? { ...d, ...data } : d)));
      resetForm();
      setShowForm(false);
      toast.success(t("toast.saveSuccess"));
    } catch {
      setError(t("rec.networkError"));
      toast.error(t("rec.networkError"));
    }
    setSaving(false);
  }

  // Helper: is the registration data essentially empty?
  const regEmpty = !reg.dateOfBirth && !reg.addressLine1 && !reg.city && !reg.cpf && !reg.sex;
  const sexLabel = reg.sex === "F" ? t("pat.sexF") : reg.sex === "M" ? t("pat.sexM") : reg.sex === "O" ? t("pat.sexO") : "";
  const missingRxLabels: Record<string, string> = {
    name: t("rec.missingRxName"),
    address: t("rec.missingRxAddress"),
    dob: t("rec.missingRxDob"),
  };
  const missingForRx = useMemo(
    () => computeMissingForRx({
      firstName: displayFirstName || null,
      lastName: displayLastName || null,
      dobDecrypted: reg.dateOfBirth || null,
      addressLine1: reg.addressLine1 || null,
      city: reg.city || null,
    }),
    [displayFirstName, displayLastName, reg.dateOfBirth, reg.addressLine1, reg.city],
  );

  const pinnedAnamnesis = useMemo(() => findPinnedAnamnesis(docs), [docs]);
  const filteredDocs = useMemo(
    () => [...docs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((d) => matchesTimelineFilter(d, recordFilter)),
    [docs, recordFilter],
  );
  const filterCounts = useMemo(() => ({
    all: docs.length,
    anamnesis: docs.filter((d) => matchesTimelineFilter(d, "anamnesis")).length,
    evolution: docs.filter((d) => matchesTimelineFilter(d, "evolution")).length,
    report: docs.filter((d) => matchesTimelineFilter(d, "report")).length,
    exam: docs.filter((d) => matchesTimelineFilter(d, "exam")).length,
    prescription: docs.filter((d) => matchesTimelineFilter(d, "prescription")).length,
    patient_shared: docs.filter((d) => matchesTimelineFilter(d, "patient_shared")).length,
  }), [docs]);

  function scrollToRecord(id: string) {
    setRecordFilter("all");
    const doc = docs.find((d) => d.id === id);
    if (isDoctorPortal) {
      if (doc?.recordKind === "ANAMNESIS") setDoctorHubOpenId("anamnesis");
      else if (doc && matchesTimelineFilter(doc, "prescription")) setDoctorHubOpenId("prescriptions");
      else if (doc && matchesTimelineFilter(doc, "exam")) setDoctorHubOpenId("exams");
      else if (doc && matchesTimelineFilter(doc, "report")) setDoctorHubOpenId("documents");
      else if (doc && matchesTimelineFilter(doc, "patient_shared")) setDoctorHubOpenId("patient_shared");
      else setDoctorHubOpenId("timeline");
    }
    if (isPsychologistPortal) {
      if (doc?.recordKind === "ANAMNESIS") setPsychHubOpenId("anamnesis");
      else if (doc?.recordKind === "SESSION_NOTE") setPsychHubOpenId("session_notes");
      else if (doc?.recordKind === "SCALE") setPsychHubOpenId("scales");
      else if (doc && matchesTimelineFilter(doc, "patient_shared")) setPsychHubOpenId("patient_shared");
      else if (doc && matchesPsychologyCfpDocument(doc)) setPsychHubOpenId("cfp_docs");
      else setPsychHubOpenId("timeline");
    }
    setExpandedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      document.getElementById(`record-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  const docsForFilter = (filter: RecordTimelineFilter) =>
    [...docs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((d) => matchesTimelineFilter(d, filter));

  const psychCfpDocs = useMemo(
    () =>
      [...docs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .filter((d) => matchesPsychologyCfpDocument(d)),
    [docs],
  );

  const psychScaleRiskAlerts = useMemo(() => {
    if (!isPsychologistPortal) return [] as { id: string; title: string; level: string; message: string }[];
    const out: { id: string; title: string; level: string; message: string }[] = [];
    for (const d of docs) {
      if (d.recordKind !== "SCALE" || !d.content) continue;
      try {
        const parsed = JSON.parse(d.content) as {
          risk?: { level?: string; messagePt?: string; messageEn?: string; messageEs?: string };
        };
        const risk = parsed?.risk;
        if (!risk?.level || risk.level === "none" || risk.level === "low") continue;
        const message =
          lang === "en" ? (risk.messageEn || "") : lang === "es" ? (risk.messageEs || "") : (risk.messagePt || "");
        out.push({ id: d.id, title: d.title, level: risk.level, message });
      } catch {
        /* ignore non-JSON */
      }
    }
    return out.sort((a, b) => {
      const rank = (l: string) => (l === "critical" ? 0 : l === "high" ? 1 : 2);
      return rank(a.level) - rank(b.level);
    });
  }, [docs, isPsychologistPortal, lang]);

  const localeFull = localeOf(lang);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <VideoConsultReturnBanner
        returnUrl={consultReturnUrl}
        patientName={`${displayFirstName} ${displayLastName}`}
        lang={lang}
      />
      <Link
        href={`${portalBase}/patients`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> {t("rec.backToPatients")}
      </Link>

      {!isOwner && ownerName && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          readOnly
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-sky-50 border-sky-200 text-sky-800"
        }`}>
          <AlertCircle size={16} className="inline mr-2 -mt-0.5" />
          {readOnly
            ? t("chart.access.view").replace("{{owner}}", ownerName)
            : t("chart.access.edit").replace("{{owner}}", ownerName)}
        </div>
      )}

      {/* Chart header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          {chart.avatarUrl ? (
            <img
              src={chart.avatarUrl}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-100"
            />
          ) : (
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-lg shrink-0">
            {displayFirstName[0] || "?"}{displayLastName[0] || ""}
          </div>
          )}
          <div className="flex-1 min-w-0">
            {editingName && canEdit ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={nameDraft.firstName}
                    onChange={(e) => setNameDraft({ ...nameDraft, firstName: e.target.value })}
                    placeholder={t("pat.firstName")}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-400 outline-none"
                  />
                  <input
                    value={nameDraft.lastName}
                    onChange={(e) => setNameDraft({ ...nameDraft, lastName: e.target.value })}
                    placeholder={t("pat.lastName")}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-400 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditingName(false); setNameMsg(null); }} className="text-xs text-slate-500 px-3 py-1.5">{t("common.cancel")}</button>
                  <button type="button" onClick={saveName} disabled={nameSaving} className="text-xs font-semibold text-white bg-brand-500 px-3 py-1.5 rounded-lg disabled:opacity-50 inline-flex items-center gap-1">
                    {nameSaving ? <Loader2 size={12} className="animate-spin" /> : null}{t("lib.save")}
                  </button>
                </div>
                {nameMsg?.startsWith("error:") && <p className="text-xs text-rose-600">{nameMsg.slice(6)}</p>}
              </div>
            ) : (
            <>
            <div className="flex items-start gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {displayFirstName} {displayLastName}
            </h1>
            {canEdit && (
              <button type="button" onClick={() => { setNameDraft({ firstName: displayFirstName, lastName: displayLastName }); setEditingName(true); }} className="text-slate-400 hover:text-brand-500 p-1" title={t("rec.editName")}>
                <Pencil size={14} />
              </button>
            )}
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-slate-500">
              {chartEmail && <p>{chartEmail}</p>}
              {(reg.phone || chart.phone) && (
                <p className="inline-flex items-center gap-2">
                  <span>{reg.phone || chart.phone}</span>
                  {/* P2: WhatsApp button — only shown when phone is on file */}
                  <a
                    href={`https://wa.me/${waPhone(reg.phone || chart.phone || "", reg.country || chart.country)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("rec.whatsapp")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-full transition"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </p>
              )}
            </div>
            <p className="text-xs mt-2">
              {hasAccount ? (
                <span className="text-brand-500 inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> {t("rec.hasAccount")}
                </span>
              ) : (
                <span className="text-amber-600 flex items-start gap-1.5">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span className="leading-snug">{t("rec.noAccount")}</span>
                </span>
              )}
            </p>
            {/* P4: message / video — only when patient has an account */}
            {chart.linkedUserId && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link
                  href={`${portalBase}/messages?with=${chart.linkedUserId}&returnUrl=${encodeURIComponent(professionalPatientsHref(pathname, chart.id))}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition"
                >
                  <MessageCircle size={13} /> {t("rec.sendMessage")}
                </Link>
                <Link
                  href={`${mapProfessionalPathToPortal(pathname, "/professional/jit")}?private=1&recordId=${encodeURIComponent(chart.id)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Video size={13} /> {t("rec.startVideoCall")}
                </Link>
                {hasConversation && (
                  <Link
                    href={`${portalBase}/messages?with=${chart.linkedUserId}&returnUrl=${encodeURIComponent(professionalPatientsHref(pathname, chart.id))}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <ExternalLink size={13} /> {t("rec.verConv")}
                  </Link>
                )}
              </div>
            )}
            {canEdit && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void openAuthenticatedPdf(`/api/professional/records/${chart.id}/export-pdf`).catch(() => toast.error(t("rec.networkError")))}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition border ${
                    isPsychologistPortal
                      ? "text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200"
                      : "text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200"
                  }`}
                >
                  <Download size={13} /> {t("rec.exportChart")}
                </button>
              </div>
            )}
            </>
            )}
            {/* ── Prescription / registration data (below photo, before quick actions) ── */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("rec.regSection")}</p>
                {!editingReg && canEdit && (
                  <button
                    onClick={openRegEditor}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <Pencil size={13} /> {regEmpty ? t("rec.addRegData") : t("rec.editRegData")}
                  </button>
                )}
              </div>
              {!isPsychologistPortal && missingForRx.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 inline-flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    {t("rec.missingRxAlert")}{" "}
                    <strong>{missingForRx.map((m) => missingRxLabels[m] || m).join(", ")}</strong>
                  </span>
                </p>
              )}
              {!isPsychologistPortal && chart.profileAllergies && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-2">
                  <strong>{t("rec.profileAllergieAlert")}</strong> {chart.profileAllergies}
                </p>
              )}
              {isPsychologistPortal && psychScaleRiskAlerts.length > 0 && (
                <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 space-y-1.5">
                  <p className="font-semibold inline-flex items-center gap-1.5">
                    <AlertTriangle size={13} className="shrink-0" />
                    {t("psychHub.riskAlertTitle")}
                  </p>
                  {psychScaleRiskAlerts.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => scrollToRecord(a.id)}
                      className="block w-full text-left text-amber-800 hover:text-amber-950"
                    >
                      <span className="font-medium">{a.title}</span>
                      {a.message ? <span className="block mt-0.5 opacity-90">{a.message}</span> : null}
                    </button>
                  ))}
                </div>
              )}
              {editingReg ? (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("rec.birthLabel")}</label>
                      <input type="date" value={regDraft.dateOfBirth} onChange={(e) => setRegDraft({ ...regDraft, dateOfBirth: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.sex")}</label>
                      <select value={regDraft.sex} onChange={(e) => setRegDraft({ ...regDraft, sex: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white">
                        <option value="">{t("pat.sexSelect")}</option>
                        <option value="F">{t("pat.sexF")}</option>
                        <option value="M">{t("pat.sexM")}</option>
                        <option value="O">{t("pat.sexO")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.phone")}</label>
                    <input value={regDraft.phone} onChange={(e) => setRegDraft({ ...regDraft, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.cpf")} <span className="text-slate-400">{t("pat.cpfHint")}</span></label>
                    <input value={regDraft.cpf} onChange={(e) => setRegDraft({ ...regDraft, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.address")}</label>
                    <input value={regDraft.addressLine1} onChange={(e) => setRegDraft({ ...regDraft, addressLine1: e.target.value })} placeholder={t("pat.addressPlaceholder")} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.city")}</label>
                      <input value={regDraft.city} onChange={(e) => setRegDraft({ ...regDraft, city: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.state")}</label>
                      <input value={regDraft.state} onChange={(e) => setRegDraft({ ...regDraft, state: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.country")}</label>
                      <input value={regDraft.country} onChange={(e) => setRegDraft({ ...regDraft, country: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.zip")}</label>
                      <input value={regDraft.zipCode} onChange={(e) => setRegDraft({ ...regDraft, zipCode: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white" />
                    </div>
                  </div>
                  {regMsg?.startsWith("error:") && (
                    <p className="text-xs text-rose-600 inline-flex items-center gap-1"><AlertCircle size={12} /> {regMsg.slice(6)}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setEditingReg(false); setRegMsg(null); }} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-white">{t("common.cancel")}</button>
                    <button onClick={saveReg} disabled={regSaving} className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2">
                      {regSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {t("lib.save")}
                    </button>
                  </div>
                </div>
              ) : regEmpty ? (
                <p className="text-sm text-slate-400">{t("rec.regEmpty")}</p>
              ) : (
                <div className="text-sm text-slate-600 space-y-1">
                  {(reg.phone || chart.phone) && <p><span className="text-slate-400">{t("pat.phone")}:</span> {reg.phone || chart.phone}</p>}
                  {reg.dateOfBirth && <p><span className="text-slate-400">{t("rec.birthLabel")}:</span> {reg.dateOfBirth.split("-").reverse().join("/")}</p>}
                  {sexLabel && <p><span className="text-slate-400">{t("pat.sex")}:</span> {sexLabel}</p>}
                  {reg.cpf && <p><span className="text-slate-400">{t("pat.cpf")}:</span> {reg.cpf}</p>}
                  {(reg.addressLine1 || reg.city || reg.state || reg.country || reg.zipCode) && (
                    <p className="inline-flex items-start gap-1">
                      <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{[reg.addressLine1, reg.city, reg.state, reg.country, reg.zipCode].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                </div>
              )}
              {regMsg === "saved" && !editingReg && (
                <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1"><CheckCircle2 size={12} /> {t("rec.regSaved")}</p>
              )}
            </div>
            {canEdit && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("chartAct.sectionTitle")}</p>
                <button
                  type="button"
                  onClick={openNewRecordForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-5 py-3 rounded-xl shadow-sm transition"
                >
                  <Plus size={18} /> {t("chartAct.newRecordHighlight")}
                  {pendingDraft && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded">
                      {t("rec.draftPending")}
                    </span>
                  )}
                </button>
                <div className="flex flex-wrap gap-2">
                  {!isDoctorPortal && !isPsychologistPortal && (
                    <button type="button" onClick={openAnamnesisForm} className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg transition">
                      <FileText size={13} /> {t("chartAct.anamnesis")}
                    </button>
                  )}
                  {!isPsychologistPortal && (
                    <button type="button" onClick={openExamResultsView} className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-lg transition">
                      <FileCheck size={13} /> {t("chartAct.examResult")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEducationModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <BookMarked size={13} /> {t("libHub.sendEducation")}
                  </button>
                </div>
                {!isPsychologistPortal && (
                  <ChartClinicalActions chartId={chart.id} returnUrl={professionalPatientsHref(pathname, chart.id)} />
                )}
                {isOwner && <ReferralPanel chartId={chart.id} />}
              </div>
            )}
          </div>
        </div>

        <PatientChartTags
          chartId={chart.id}
          initialTags={initialTags}
          readOnly={!canEdit}
          suggestedAllergy={isPsychologistPortal ? null : chart.profileAllergies}
          allowedKinds={isPsychologistPortal ? ["MEDICATION", "OTHER"] : undefined}
          defaultKind={isPsychologistPortal ? "OTHER" : undefined}
        />

        {/* ── Etapa 3c: email & invite management (only meaningful when no account) ── */}
        {canEdit && !hasAccount && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{t("rec.patientAccess")}</p>

            {editingEmail ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">{t("pat.email")}</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="patient@email.com"
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                  <button
                    onClick={saveEmail}
                    disabled={emailSaving}
                    className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {emailSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {t("lib.save")}
                  </button>
                  <button
                    onClick={() => { setEditingEmail(false); setEmailDraft(chartEmail || ""); setEmailMsg(null); }}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-700">
                  {chartEmail ? chartEmail : <span className="text-slate-400">{t("rec.noEmail")}</span>}
                </span>
                <button
                  onClick={() => { setEditingEmail(true); setEmailMsg(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Pencil size={13} /> {chartEmail ? t("rec.editEmail") : t("rec.addEmail")}
                </button>

                {chartEmail && (
                  <button
                    onClick={resendInvite}
                    disabled={inviteSending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {inviteSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {t("rec.sendInvite")}
                  </button>
                )}
              </div>
            )}

            {inviteStatus && (
              <p className="text-xs mt-2 inline-flex items-center gap-1.5">
                {inviteStatus.status === "LINKED" ? (
                  <span className="text-brand-600 font-medium">
                    <CheckCircle2 size={12} className="inline mr-1" />
                    {t("rec.inviteStatusLinked")}
                  </span>
                ) : inviteStatus.status === "FAILED" ? (
                  <span className="text-rose-600">
                    <AlertCircle size={12} className="inline mr-1" />
                    {t("rec.inviteStatusFailed")}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    <Mail size={12} className="inline mr-1" />
                    {t("rec.inviteLastSent").replace(
                      "{{date}}",
                      new Date(inviteStatus.sentAt).toLocaleDateString(localeFull),
                    )}
                  </span>
                )}
              </p>
            )}

            {/* messages */}
            {emailMsg === "saved" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> {t("rec.emailUpdated")}
              </p>
            )}
            {emailMsg === "linked" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> {t("rec.emailLinked")}
              </p>
            )}
            {emailMsg?.startsWith("error:") && (
              <p className="text-xs text-rose-600 mt-2 inline-flex items-center gap-1">
                <AlertCircle size={12} /> {emailMsg.slice(6)}
              </p>
            )}
            {inviteMsg === "sent" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <Mail size={12} /> {t("rec.inviteSentTo").replace("{{email}}", chartEmail || "")}
              </p>
            )}
            {inviteMsg?.startsWith("error:") && (
              <p className="text-xs text-rose-600 mt-2 inline-flex items-center gap-1">
                <AlertCircle size={12} /> {inviteMsg.slice(6)}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("rec.notes")}</p>
            {canEdit && !editingNotes && (
              <button type="button" onClick={() => { setNotesDraft(chartNotes); setEditingNotes(true); }} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-brand-500">
                <Pencil size={12} /> {chartNotes ? t("rec.editNotes") : t("rec.addNotes")}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-400 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingNotes(false)} className="text-xs text-slate-500 px-3 py-1.5">{t("common.cancel")}</button>
                <button type="button" onClick={saveNotes} disabled={notesSaving} className="text-xs font-semibold text-white bg-brand-500 px-3 py-1.5 rounded-lg disabled:opacity-50 inline-flex items-center gap-1">
                  {notesSaving ? <Loader2 size={12} className="animate-spin" /> : null}{t("lib.save")}
                </button>
              </div>
            </div>
          ) : chartNotes ? (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{chartNotes}</p>
          ) : (
            <p className="text-sm text-slate-400">{t("rec.notesEmpty")}</p>
          )}
        </div>
      </div>

      {isDoctorPortal ? (
        <DoctorClinicalHub
          openId={doctorHubOpenId}
          onOpenChange={setDoctorHubOpenId}
          headerExtras={{
            anamnesis: {
              badge: pinnedAnamnesis ? (
                <span className="text-[10px] font-semibold normal-case tracking-normal text-accent-600 bg-white/70 border border-accent-200 px-1.5 py-0.5 rounded-full">
                  {t("timeline.pinnedAnamnesis")}
                </span>
              ) : null,
              description: pinnedAnamnesis ? pinnedAnamnesis.title : t("doctorHub.desc.anamnesis"),
              cta: canEdit
                ? pinnedAnamnesis
                  ? { kind: "button", label: t("chart.addNewInformation"), onClick: openNewRecordForm }
                  : { kind: "button", label: t("chart.createAnamnesis"), onClick: openAnamnesisForm }
                : null,
            },
            prescriptions: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("chartAct.prescribe"),
                    href: chartActionUrl(prescriptionsPath, chart.id, { view: "prescription", returnUrl: chartReturnUrl }),
                  }
                : null,
            },
            exams: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("chartAct.exam"),
                    href: chartActionUrl(prescriptionsPath, chart.id, { view: "exam", returnUrl: chartReturnUrl }),
                  }
                : null,
            },
            documents: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("chartAct.document"),
                    href: chartActionUrl(prescriptionsPath, chart.id, { view: "document", returnUrl: chartReturnUrl }),
                  }
                : null,
            },
            vitals: {
              cta: canEdit
                ? { kind: "button", label: t("metric.addVitalsCta"), onClick: openVitalsRecordForm }
                : null,
            },
          }}
          panels={{
            anamnesis: pinnedAnamnesis ? (
              <div className="space-y-3">
                <PinnedAnamnesisCard
                  title={pinnedAnamnesis.title}
                  preview={pinnedAnamnesis.content ? formatRecordContentForDisplay(pinnedAnamnesis.content).slice(0, 200) : ""}
                  dateLabel={new Date(pinnedAnamnesis.createdAt).toLocaleDateString(localeFull, {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                  onView={() => scrollToRecord(pinnedAnamnesis.id)}
                />
                <ChartDocsList
                  docs={docsForFilter("anamnesis")}
                  totalDocs={docs.length}
                  lang={lang}
                  t={t}
                  legacyLabel={legacyLabel}
                  pinnedAnamnesisId={pinnedAnamnesis.id}
                  expandedIds={expandedIds}
                  setExpandedIds={setExpandedIds}
                  shareStatus={shareStatus}
                  sharingId={sharingId}
                  copiedId={copiedId}
                  canEdit={canEdit}
                  patientName={`${displayFirstName} ${displayLastName}`}
                  onCopy={handleCopy}
                  onPrint={handlePrint}
                  onEdit={openEditForm}
                  onShare={handleShare}
                  onInvite={handleInvite}
                  onReuse={reuseEmissionDoc}
                  onSign={signEmissionDoc}
                  onDelivered={markEmissionDelivered}
                  onPdfError={(msg) => toast.error(msg)}
                  compact
                />
              </div>
            ) : (
              <p className="text-sm text-slate-600">{t("doctorHub.desc.anamnesis")}</p>
            ),
            timeline: (
              <ChartActivityTimeline
                chartId={chart.id}
                events={initialActivityTimeline}
                pathname={pathname}
              />
            ),
            prescriptions: (
              <ChartDocsList
                docs={docsForFilter("prescription")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            exams: (
              <div className="space-y-3">
                {canEdit && (
                  <button
                    type="button"
                    onClick={openExamResultsView}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-800 bg-white border border-cyan-200 px-3 py-2 rounded-xl"
                  >
                    <FileCheck size={14} /> {t("chartAct.examResult")}
                  </button>
                )}
                <ChartDocsList
                  docs={docsForFilter("exam")}
                  totalDocs={docs.length}
                  lang={lang}
                  t={t}
                  legacyLabel={legacyLabel}
                  pinnedAnamnesisId={pinnedAnamnesis?.id}
                  expandedIds={expandedIds}
                  setExpandedIds={setExpandedIds}
                  shareStatus={shareStatus}
                  sharingId={sharingId}
                  copiedId={copiedId}
                  canEdit={canEdit}
                  patientName={`${displayFirstName} ${displayLastName}`}
                  onCopy={handleCopy}
                  onPrint={handlePrint}
                  onEdit={openEditForm}
                  onShare={handleShare}
                  onInvite={handleInvite}
                  onReuse={reuseEmissionDoc}
                  onSign={signEmissionDoc}
                  onDelivered={markEmissionDelivered}
                  onPdfError={(msg) => toast.error(msg)}
                  compact
                />
              </div>
            ),
            documents: (
              <ChartDocsList
                docs={docsForFilter("report")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            patient_shared: (
              <ChartDocsList
                docs={docsForFilter("patient_shared")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            vitals: (
              <MetricsEvolutionPanel
                chartId={chart.id}
                onAddVitals={canEdit ? openVitalsRecordForm : undefined}
                readOnly={!canEdit}
              />
            ),
            diagnoses: <DiagnosesPanel chartId={chart.id} readOnly={!canEdit} />,
            vaccines: <VaccinationPanel chartId={chart.id} readOnly={!canEdit} />,
            growth: (
              <GrowthCurvePanel chartId={chart.id} dateOfBirth={chart.dateOfBirth} sex={chart.sex} />
            ),
            dental: <OdontogramPanel chartId={chart.id} readOnly={!canEdit} />,
            audio: <AudiogramPanel chartId={chart.id} readOnly={!canEdit} />,
          }}
        />
      ) : isPsychologistPortal ? (
        <PsychologistClinicalHub
          openId={psychHubOpenId}
          onOpenChange={setPsychHubOpenId}
          headerExtras={{
            anamnesis: {
              badge: pinnedAnamnesis ? (
                <span className="text-[10px] font-semibold normal-case tracking-normal text-violet-700 bg-white/70 border border-violet-200 px-1.5 py-0.5 rounded-full">
                  {t("timeline.pinnedAnamnesis")}
                </span>
              ) : null,
              description: pinnedAnamnesis ? pinnedAnamnesis.title : t("psychHub.desc.anamnesis"),
              cta: canEdit
                ? pinnedAnamnesis
                  ? { kind: "button", label: t("chart.addNewInformation"), onClick: openNewRecordForm }
                  : { kind: "button", label: t("chart.createAnamnesis"), onClick: openAnamnesisForm }
                : null,
            },
            session_notes: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("psychHub.cta.newSession"),
                    href: chartActionUrl("/psychologist/sessions", chart.id, {
                      view: "create",
                      returnUrl: chartReturnUrl,
                    }),
                  }
                : null,
            },
            scales: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("psychHub.cta.applyScale"),
                    href: chartActionUrl("/psychologist/scales", chart.id, {
                      view: "apply",
                      returnUrl: chartReturnUrl,
                    }),
                  }
                : null,
            },
            cfp_docs: {
              cta: canEdit
                ? {
                    kind: "link",
                    label: t("psychHub.cta.cfpDocument"),
                    href: chartActionUrl("/psychologist/documents", chart.id, {
                      returnUrl: chartReturnUrl,
                    }),
                  }
                : null,
            },
          }}
          panels={{
            anamnesis: (
              <div className="space-y-3">
                {canEdit && (
                  <Link
                    href={chartActionUrl("/psychologist/anamnesis", chart.id, { returnUrl: chartReturnUrl })}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-violet-800 bg-white border border-violet-200 px-3 py-2 rounded-xl"
                  >
                    {t("psychHub.cta.digitalAnamnesis")}
                  </Link>
                )}
                {pinnedAnamnesis ? (
                  <>
                    <PinnedAnamnesisCard
                      title={pinnedAnamnesis.title}
                      preview={pinnedAnamnesis.content ? formatRecordContentForDisplay(pinnedAnamnesis.content).slice(0, 200) : ""}
                      dateLabel={new Date(pinnedAnamnesis.createdAt).toLocaleDateString(localeFull, {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                      onView={() => scrollToRecord(pinnedAnamnesis.id)}
                    />
                    <ChartDocsList
                      docs={docsForFilter("anamnesis")}
                      totalDocs={docs.length}
                      lang={lang}
                      t={t}
                      legacyLabel={legacyLabel}
                      pinnedAnamnesisId={pinnedAnamnesis.id}
                      expandedIds={expandedIds}
                      setExpandedIds={setExpandedIds}
                      shareStatus={shareStatus}
                      sharingId={sharingId}
                      copiedId={copiedId}
                      canEdit={canEdit}
                      patientName={`${displayFirstName} ${displayLastName}`}
                      onCopy={handleCopy}
                      onPrint={handlePrint}
                      onEdit={openEditForm}
                      onShare={handleShare}
                      onInvite={handleInvite}
                      onReuse={reuseEmissionDoc}
                      onSign={signEmissionDoc}
                      onDelivered={markEmissionDelivered}
                      onPdfError={(msg) => toast.error(msg)}
                      compact
                    />
                  </>
                ) : (
                  <p className="text-sm text-slate-600">{t("psychHub.desc.anamnesis")}</p>
                )}
              </div>
            ),
            timeline: (
              <ChartActivityTimeline
                chartId={chart.id}
                events={initialActivityTimeline}
                pathname={pathname}
              />
            ),
            session_notes: (
              <ChartDocsList
                docs={docsForFilter("session_note")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            scales: (
              <ChartDocsList
                docs={docsForFilter("scale")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            cfp_docs: (
              <ChartDocsList
                docs={psychCfpDocs}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            patient_shared: (
              <ChartDocsList
                docs={docsForFilter("patient_shared")}
                totalDocs={docs.length}
                lang={lang}
                t={t}
                legacyLabel={legacyLabel}
                pinnedAnamnesisId={pinnedAnamnesis?.id}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                shareStatus={shareStatus}
                sharingId={sharingId}
                copiedId={copiedId}
                canEdit={canEdit}
                patientName={`${displayFirstName} ${displayLastName}`}
                onCopy={handleCopy}
                onPrint={handlePrint}
                onEdit={openEditForm}
                onShare={handleShare}
                onInvite={handleInvite}
                onReuse={reuseEmissionDoc}
                onSign={signEmissionDoc}
                onDelivered={markEmissionDelivered}
                onPdfError={(msg) => toast.error(msg)}
                compact
              />
            ),
            audit: isOwner ? (
              <PsychologyChartAuditPanel chartId={chart.id} />
            ) : (
              <p className="text-sm text-slate-500">{t("psychHub.desc.audit")}</p>
            ),
          }}
        />
      ) : (
        <>
      {!pinnedAnamnesis && chartTab === "records" && (
        <AnamnesisPromptBanner onCreate={openAnamnesisForm} readOnly={!canEdit} />
      )}

      {/* Chart tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: "activity" as const, label: t("chartTab.activity"), icon: Clock },
          { id: "records" as const, label: t("chartTab.records"), icon: FileText },
          { id: "evolution" as const, label: t("chartTab.evolution"), icon: Activity },
          { id: "diagnoses" as const, label: t("chartTab.diagnoses"), icon: Stethoscope },
          { id: "vaccines" as const, label: t("chartTab.vaccines"), icon: Syringe },
          { id: "growth" as const, label: t("chartTab.growth"), icon: LineChart },
          { id: "dental" as const, label: t("chartTab.dental"), icon: Grid3X3 },
          { id: "audio" as const, label: t("chartTab.audio"), icon: Ear },
          ...(isNutritionistPortal
            ? [{ id: "nutrition" as const, label: t("nav.nutrition"), icon: Utensils }]
            : []),
          ...(isNursePortal
            ? [{ id: "nursing" as const, label: t("nav.nursing"), icon: HeartPulse }]
            : []),
          ...(isPharmacistPortal
            ? [{ id: "pharmacy" as const, label: t("nav.pharmacy"), icon: Pill }]
            : []),
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setChartTab(tab.id)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition border ${
              chartTab === tab.id
                ? "text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-300 ring-1 ring-brand-200"
                : "text-slate-600 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {chartTab === "activity" && (
        <ChartActivityTimeline
          chartId={chart.id}
          events={initialActivityTimeline}
          pathname={pathname}
        />
      )}

      {chartTab === "evolution" && (
        <MetricsEvolutionPanel
          chartId={chart.id}
          onAddVitals={canEdit ? openVitalsRecordForm : undefined}
          readOnly={!canEdit}
        />
      )}
      {chartTab === "diagnoses" && <DiagnosesPanel chartId={chart.id} readOnly={!canEdit} />}
      {chartTab === "vaccines" && (
        <VaccinationPanel chartId={chart.id} readOnly={!canEdit} />
      )}
      {chartTab === "growth" && (
        <GrowthCurvePanel chartId={chart.id} dateOfBirth={chart.dateOfBirth} sex={chart.sex} />
      )}
      {chartTab === "dental" && (
        <OdontogramPanel chartId={chart.id} readOnly={!canEdit} />
      )}
      {chartTab === "audio" && (
        <AudiogramPanel chartId={chart.id} readOnly={!canEdit} />
      )}
      {chartTab === "nutrition" && isNutritionistPortal && (
        <NutritionPatientChartPanel chartId={chart.id} />
      )}
      {chartTab === "nursing" && isNursePortal && (
        <NursePatientChartPanel chartId={chart.id} />
      )}
      {chartTab === "pharmacy" && isPharmacistPortal && (
        <PharmacistPatientChartPanel chartId={chart.id} />
      )}

      {chartTab === "records" && (
      <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-slate-900">{t("chartTab.records")}</h2>
        {canEdit && (
          <button
            type="button"
            onClick={openNewRecordForm}
            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl shadow-sm transition"
          >
            <Plus size={16} /> {t("chartAct.newRecordHighlight")}
          </button>
        )}
      </div>

      {pinnedAnamnesis && recordFilter === "all" && (
        <PinnedAnamnesisCard
          title={pinnedAnamnesis.title}
          preview={pinnedAnamnesis.content ? formatRecordContentForDisplay(pinnedAnamnesis.content).slice(0, 200) : ""}
          dateLabel={new Date(pinnedAnamnesis.createdAt).toLocaleDateString(localeFull, {
            day: "2-digit", month: "long", year: "numeric",
          })}
          onView={() => scrollToRecord(pinnedAnamnesis.id)}
        />
      )}

      <RecordTimelineFilters
        value={recordFilter}
        onChange={setRecordFilter}
        counts={filterCounts}
      />

      <ChartDocsList
        docs={filteredDocs}
        totalDocs={docs.length}
        lang={lang}
        t={t}
        legacyLabel={legacyLabel}
        pinnedAnamnesisId={pinnedAnamnesis?.id}
        expandedIds={expandedIds}
        setExpandedIds={setExpandedIds}
        shareStatus={shareStatus}
        sharingId={sharingId}
        copiedId={copiedId}
        canEdit={canEdit}
        patientName={`${displayFirstName} ${displayLastName}`}
        onCopy={handleCopy}
        onPrint={handlePrint}
        onEdit={openEditForm}
        onShare={handleShare}
        onInvite={handleInvite}
        onReuse={reuseEmissionDoc}
        onSign={signEmissionDoc}
        onDelivered={markEmissionDelivered}
        onPdfError={(msg) => toast.error(msg)}
      />
      </>
      )}
        </>
      )}

      {/* Add / edit record modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">
                {editingDoc ? t("rec.editRecord") : t("rec.modal.newRecord")}
              </h2>
              <button onClick={() => { setShowForm(false); setDraftRestored(false); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {voicePrefillActive && !editingDoc && <VoicePrefillBanner active />}
              {!editingDoc && draftRestored && (
                <p className="text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                  {t("rec.draftRestored")}
                </p>
              )}
              {!editingDoc && (
              <div>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 size={14} className="animate-spin" /> {t("docs.modal.loadingCategories")}
                  </div>
                ) : sortedCategories.length === 0 ? (
                  <p className="text-sm text-amber-600">{t("docs.modal.noCategories")}</p>
                ) : (
                  <CategorySearchSelect
                    label={t("docs.modal.category")}
                    options={sortedCategories.map((c) => ({ id: c.id, label: c.label }))}
                    value={categoryId}
                    onChange={setCategoryId}
                  />
                )}
              </div>
              )}
              <CidSearchInput
                value={cidSelection}
                onChange={setCidSelection}
                required={false}
              />
              {!editingDoc && cidSelection && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToDiagnoses}
                    onChange={(e) => setAddToDiagnoses(e.target.checked)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  {t("diag.addFromRecord")}
                </label>
              )}
              {(editingDoc || cidSelection) && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("rec.titleLabel")}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("rec.titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.descLabel")}</label>
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder={undefined}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
                />
              </div>
              <ClinicalCalculators onInsert={insertCalcText} />
              {!editingDoc && (
                <MetricsFormFields value={metrics} onChange={setMetrics} />
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("rec.modal.attachment")} <span className="text-slate-400">{t("rec.modal.attachmentHint")}</span>
                </label>
                {editingDoc && (editingDoc.attachmentCount ?? (editingDoc.hasFile ? 1 : 0)) > 0 && files.length === 0 && (
                  <p className="text-xs text-slate-500 mb-2">
                    {t("rec.addMoreFiles").replace("{n}", String(editingDoc.attachmentCount ?? (editingDoc.hasFile ? 1 : 0)))}
                  </p>
                )}
                {editingDoc && (editingDoc.attachmentCount ?? 0) === 0 && !editingDoc.hasFile && (
                  <p className="text-xs text-slate-500 mb-2">{t("rec.addFilesHint")}</p>
                )}
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*,video/mp4,video/quicktime,video/webm"
                  capture="environment"
                  onChange={(e) => handleFilesChange(e.target.files)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:text-sm file:font-medium hover:file:bg-brand-100"
                />
                {files.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {files.map((f) => (
                      <p key={`${f.name}-${f.size}`}>{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</p>
                    ))}
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-3 space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg border border-slate-200 object-contain" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotateImage("left")}
                        disabled={rotating}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        {rotating ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} className="-scale-x-100" />}
                        {t("rec.rotateLeft")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotateImage("right")}
                        disabled={rotating}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        {rotating ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                        {t("rec.rotateRight")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowForm(false); setDraftRestored(false); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={editingDoc ? handleUpdate : handleCreate}
                  disabled={saving || (!editingDoc && categoriesLoading)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("docs.modal.saving") : editingDoc ? t("rec.saveChanges") : t("rec.modal.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {signTarget && (
        <EmissionsSignModal
          target={signTarget}
          signConfig={signConfig}
          deliverAfter
          onClose={() => setSignTarget(null)}
        />
      )}

      {showEducationModal && (
        <SendEducationModal
          chartId={chart.id}
          patientName={`${displayFirstName} ${displayLastName}`.trim()}
          onClose={() => setShowEducationModal(false)}
        />
      )}

      {showExamResultsModal && (
        <PatientExamResultsModal
          results={docs
            .filter((d) => d.type === "EXAM_RESULT" && !!d.sourceDocumentId)
            .map((d) => ({
              id: d.id,
              title: d.title,
              content: d.content,
              hasFile: d.hasFile,
              attachmentCount: d.attachmentCount,
              createdAt: d.createdAt,
            }))}
          requestExamHref={chartActionUrl(prescriptionsPath, chart.id, {
            view: "exam",
            returnUrl: chartReturnUrl,
          })}
          lang={lang}
          t={t}
          onClose={() => setShowExamResultsModal(false)}
          onRegisterManually={openExamResultForm}
          onOpenResult={openPatientExamResultInChart}
        />
      )}
    </div>
  );
}
