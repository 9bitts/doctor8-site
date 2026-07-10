"use client";

// src/app/(dashboard)/professional/patients/[id]/RecordDetailClient.tsx
// Chart detail + add clinical record (title + text + optional file upload to S3).
// Phase 4B: the category selector is now dynamic (grouped categories from the DB).
// Etapa 3c: edit the chart's email (only when no account) + resend prescription invite.
// P1-b: edit the chart's registration data (birth, sex, cpf, address) used by the prescription.
// P2: "Diagnóstico / Título" label (trilíngue) + botão WhatsApp no cabeçalho da ficha.

import { useState, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Plus, X, FileText, Paperclip, CheckCircle2, AlertCircle,
  Share2, Mail, Loader2, Tag, Pencil, Send, MapPin, MessageCircle, ExternalLink,
  Copy, Printer, RotateCw, ChevronDown, ChevronUp, FileType, Film, Download,
  Activity, Stethoscope, Syringe, LineChart, Grid3X3, Ear, Utensils, HeartPulse, Pill, FileCheck,
} from "lucide-react";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { EmissionCardActions } from "@/components/professional/emissions/EmissionCardActions";
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
import ChartSharePanel from "@/components/professional/ChartSharePanel";
import ChartClinicalActions from "@/components/professional/ChartClinicalActions";
import { openAuthenticatedPdf } from "@/lib/open-url-safely";
import {
  RecordTimelineFilters,
  PinnedAnamnesisCard,
  AnamnesisPromptBanner,
  RecordKindBadge,
  RecordTimelineDot,
} from "@/components/professional/PatientRecordTimeline";
import { consumeVoiceFormPrefill } from "@/lib/voice-assistant/prefill-storage";
import { VoicePrefillBanner } from "@/components/voice-assistant/useVoiceFormPrefill";
import type { ChartEvolutionPrefill } from "@/lib/voice-assistant/types";
import { RecordFileThumbnail } from "@/components/professional/RecordFileThumbnail";
import {
  mapProfessionalPathToPortal,
  professionalPatientsHref,
} from "@/lib/psychologist-portal";
import { hasAnyMetric, type ClinicalMetricsInput } from "@/lib/clinical-metrics";
import {
  RECORD_KIND_OPTIONS,
  type ClinicalRecordKind,
  type RecordTimelineFilter,
  matchesTimelineFilter,
  suggestRecordKind,
  findPinnedAnamnesis,
  recordKindLabelKey,
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
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/category-i18n";
import {
  buildRecordCopyText, formatRecordContentForDisplay, parseRecordContent,
  isPsychologyStructuredContent, countRecordAttachments,
} from "@/lib/record-content";
import { isImageFile, rotateImageFile } from "@/lib/image-rotate";

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

type RecordFilePreview = {
  index: number;
  url: string;
  name: string;
  kind: "image" | "pdf" | "video" | "other";
};

function emissionKindFromDocType(type: string): EmissionKind | null {
  if (type === "PRESCRIPTION") return "prescription";
  if (type === "EXAM_REQUEST" || type === "EXAM_RESULT") return "exam";
  if (["CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER"].includes(type)) return "document";
  return null;
}

function isEmissionDoc(doc: Doc): boolean {
  return emissionKindFromDocType(doc.type) !== null;
}

const CONTENT_PREVIEW_CHARS = 160;

function RecordAttachmentStrip({
  docId,
  count,
  t,
}: {
  docId: string;
  count: number;
  t: (k: string) => string;
}) {
  const [files, setFiles] = useState<RecordFilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (count === 0) return;
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`/api/professional/documents/${docId}/files`);
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        setFiles(data.files || []);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [docId, count]);

  if (count === 0) return null;

  return (
    <div className="mt-2">
      {loading && (
        <p className="text-xs text-slate-400 inline-flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> {t("rec.attachLoading")}
        </p>
      )}
      {error && !loading && (
        <p className="text-xs text-rose-500">{t("rec.attachLoading")}</p>
      )}
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin max-w-full">
          {files.map((f) => (
            <a
              key={f.index}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              title={f.name || t("rec.openFile")}
              className="flex-shrink-0 snap-start w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-brand-300 hover:ring-2 hover:ring-brand-100 transition"
            >
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <RecordFileThumbnail kind={f.kind} name={f.name} />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
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

// Clean phone for wa.me (digits only, add country code if starts with 0 or missing +)
function waPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // If already has country code (e.g. 5511...) keep it; else assume BR (+55)
  if (digits.length >= 12) return digits;
  if (digits.startsWith("0")) return "55" + digits.slice(1);
  return "55" + digits;
}

export default function RecordDetailClient({
  chart,
  initialDocuments,
  initialTags = [],
  chartAccess = "owner",
  readOnly = false,
  ownerName,
}: {
  chart: Chart;
  initialDocuments: Doc[];
  initialTags?: ChartTag[];
  chartAccess?: "owner" | "edit" | "view";
  readOnly?: boolean;
  ownerName?: string;
}) {
  const isOwner = chartAccess === "owner";
  const canEdit = !readOnly && chartAccess !== "view";
  const pathname = usePathname();
  const isNutritionistPortal = pathname.startsWith("/nutricionista");
  const isPsychologistPortal = pathname.startsWith("/psychologist");
  const isNursePortal = pathname.startsWith("/enfermeiro");
  const isPharmacistPortal = pathname.startsWith("/farmaceutico");
  const isMedicalPortal =
    pathname.startsWith("/professional") &&
    !isPsychologistPortal &&
    !isNutritionistPortal &&
    !isNursePortal &&
    !isPharmacistPortal;
  const portalBase = mapProfessionalPathToPortal(pathname, "/professional");
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const { lang, t } = useI18n();
  const toast = useToast();
  const searchParams = useSearchParams();
  const consultReturnUrl = searchParams.get("returnUrl");
  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
  const [chartTab, setChartTab] = useState<"records" | "evolution" | "diagnoses" | "vaccines" | "growth" | "dental" | "audio" | "nutrition" | "nursing" | "pharmacy">("records");
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
  });
  const [editingReg, setEditingReg] = useState(false);
  const [regDraft, setRegDraft] = useState(reg);
  const [regSaving, setRegSaving] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);

  // Dynamic categories
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Share state, keyed by document id
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
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

  useEffect(() => {
    const payload = consumeVoiceFormPrefill("chart_evolution", chart.id);
    if (!payload) return;
    const d = payload.data as ChartEvolutionPrefill;
    setTitle(d.title || (lang === "es" ? "Evolución — asistente de voz" : lang === "en" ? "Evolution — voice assistant" : "Evolução — assistente de voz"));
    setContent(d.draft);
    setRecordKind("EVOLUTION");
    setChartTab("evolution");
    setShowForm(true);
    setVoicePrefillActive(true);
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
        const first = gs[0]?.items[0];
        if (first) setCategoryId(first.id);
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
    if (searchParams.get("newRecord") !== "1" || categoriesLoading) return;
    const docType = searchParams.get("docType");
    if (docType === "EXAM_RESULT") {
      openExamResultForm();
    } else {
      openNewRecordForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialDocuments, categoriesLoading, groups]);

  useEffect(() => {
    const tab = searchParams.get("tab") ?? searchParams.get("view");
    const validTabs = new Set([
      "records", "evolution", "diagnoses", "vaccines", "growth", "dental", "audio",
      "nutrition", "nursing", "pharmacy",
    ]);
    if (tab && validTabs.has(tab)) {
      if (tab === "nutrition" && !isNutritionistPortal) return;
      if (tab === "nursing" && !isNursePortal) return;
      if (tab === "pharmacy" && !isPharmacistPortal) return;
      setChartTab(tab as typeof chartTab);
    }
  }, [searchParams, isNutritionistPortal, isNursePortal, isPharmacistPortal]);

  useEffect(() => {
    const recordId = searchParams.get("recordId");
    if (!recordId) return;
    setChartTab("records");
    setRecordFilter("all");
    setExpandedIds((prev) => new Set(prev).add(recordId));
    const timer = setTimeout(() => {
      document.getElementById(`record-${recordId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => clearTimeout(timer);
  }, [searchParams]);

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
    const first = groups[0]?.items[0];
    setCategoryId(first ? first.id : "");
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
      setRecordKind("ANAMNESIS");
    }
    setChartTab("records");
    setRecordFilter("anamnesis");
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

  function openExamResultForm() {
    resetForm();
    setRecordKind("OTHER");
    const catId = findCategoryIdByLegacyType(groups, "EXAM_RESULT");
    if (catId) setCategoryId(catId);
    setChartTab("records");
    setRecordFilter("exam");
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
    const fd = new FormData();
    fd.append("file", f);
    fd.append("folder", `records/${chart.id}`);
    const up = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "same-origin" });
    const upData = await up.json();
    if (!up.ok) {
      setError(upData.error || t("rec.uploadFailed"));
      return null;
    }
    return upData.key as string;
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

  // ── Etapa 3c: save edited email ──
  async function saveEmail() {
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const res = await fetch(`/api/professional/records/${chart.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailMsg("error:" + (typeof data.error === "string" ? data.error : t("rec.emailUpdateFailed")));
      } else {
        setChartEmail(data.email);
        setHasAccount(!!data.hasAccount);
        setEditingEmail(false);
        setEmailMsg(data.hasAccount ? "linked" : "saved");
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
      const res = await fetch(`/api/professional/records/${chart.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: regDraft.dateOfBirth,
          sex: regDraft.sex,
          cpf: regDraft.cpf,
          addressLine1: regDraft.addressLine1,
          city: regDraft.city,
          state: regDraft.state,
          country: regDraft.country,
          zipCode: regDraft.zipCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegMsg("error:" + (typeof data.error === "string" ? data.error : t("rec.regSaveFailed")));
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
    const view = kind === "prescription" ? "prescription" : kind === "exam" ? "exam" : "document";
    const href = `${portalBase}/prescriptions?patientRecordId=${chart.id}&view=${view}`;
    window.location.href = href;
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
    for (const g of groups) {
      const cat = g.items.find((c) => c.id === categoryId);
      if (cat) {
        categoryLabel = getCategoryLabel(lang, { slug: cat.slug, name: cat.name });
        break;
      }
    }
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
          recordKind,
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
          recordKind: data.recordKind || recordKind,
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
  }), [docs]);

  function scrollToRecord(id: string) {
    setRecordFilter("all");
    setExpandedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      document.getElementById(`record-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  const localeFull = localeOf(lang);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <VideoConsultReturnBanner
        returnUrl={consultReturnUrl}
        patientName={`${chart.firstName} ${chart.lastName}`}
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
            {chart.firstName[0]}{chart.lastName[0]}
          </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              {chart.firstName} {chart.lastName}
            </h1>
            <div className="mt-1 space-y-0.5 text-sm text-slate-500">
              {chartEmail && <p>{chartEmail}</p>}
              {chart.phone && (
                <p className="inline-flex items-center gap-2">
                  <span>{chart.phone}</span>
                  {/* P2: WhatsApp button — only shown when phone is on file */}
                  <a
                    href={`https://wa.me/${waPhone(chart.phone)}`}
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
            {/* P4: message buttons — only when patient has an account */}
            {chart.linkedUserId && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <a
                  href={`${portalBase}/messages?with=${chart.linkedUserId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition"
                >
                  <MessageCircle size={13} /> {t("rec.sendMessage")}
                </a>
                {hasConversation && (
                  <a
                    href={`${portalBase}/messages?with=${chart.linkedUserId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <ExternalLink size={13} /> {t("rec.verConv")}
                  </a>
                )}
              </div>
            )}
            {isPsychologistPortal && (
              <div className="mt-3">
                <a
                  href={`/api/professional/records/${chart.id}/export-pdf`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Download size={13} /> {t("psy.exportChart")}
                </a>
              </div>
            )}
            {canEdit && isOwner && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("chartAct.sectionTitle")}</p>
                <ChartClinicalActions
                  chartId={chart.id}
                  returnUrl={professionalPatientsHref(pathname, chart.id)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openExamResultForm}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <FileCheck size={13} /> {t("chartAct.examResult")}
                  </button>
                  <button
                    type="button"
                    onClick={openNewRecordForm}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <Plus size={13} /> {t("timeline.addRecord")}
                    {pendingDraft && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-200/60 px-1.5 py-0.5 rounded">
                        {t("rec.draftPending")}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ReferralPanel chartId={chart.id} />
                  {isMedicalPortal && <ReferralPanel chartId={chart.id} presetSpecialty="psychology" />}
                </div>
              </div>
            )}
          </div>
        </div>

        <PatientChartTags chartId={chart.id} initialTags={initialTags} readOnly={!canEdit} />

        {isOwner && (
          <div className="mt-3">
            <ChartSharePanel chartId={chart.id} />
          </div>
        )}

        {isPsychologistPortal && isOwner && (
          <div className="mt-4">
            <PsychologyChartAuditPanel chartId={chart.id} />
          </div>
        )}

        {/* ── P1-b: registration data (for the prescription) ── */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("rec.regSection")}</p>
            {!editingReg && canEdit && isOwner && (
              <button
                onClick={openRegEditor}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil size={13} /> {regEmpty ? t("rec.addRegData") : t("rec.editRegData")}
              </button>
            )}
          </div>

          {editingReg ? (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("rec.birthLabel")}</label>
                  <input
                    type="date"
                    value={regDraft.dateOfBirth}
                    onChange={(e) => setRegDraft({ ...regDraft, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.sex")}</label>
                  <select
                    value={regDraft.sex}
                    onChange={(e) => setRegDraft({ ...regDraft, sex: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  >
                    <option value="">{t("pat.sexSelect")}</option>
                    <option value="F">{t("pat.sexF")}</option>
                    <option value="M">{t("pat.sexM")}</option>
                    <option value="O">{t("pat.sexO")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.cpf")} <span className="text-slate-400">{t("pat.cpfHint")}</span></label>
                <input
                  value={regDraft.cpf}
                  onChange={(e) => setRegDraft({ ...regDraft, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.address")}</label>
                <input
                  value={regDraft.addressLine1}
                  onChange={(e) => setRegDraft({ ...regDraft, addressLine1: e.target.value })}
                  placeholder={t("pat.addressPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.city")}</label>
                  <input
                    value={regDraft.city}
                    onChange={(e) => setRegDraft({ ...regDraft, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.state")}</label>
                  <input
                    value={regDraft.state}
                    onChange={(e) => setRegDraft({ ...regDraft, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.country")}</label>
                  <input
                    value={regDraft.country}
                    onChange={(e) => setRegDraft({ ...regDraft, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.zip")}</label>
                  <input
                    value={regDraft.zipCode}
                    onChange={(e) => setRegDraft({ ...regDraft, zipCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
              </div>

              {regMsg?.startsWith("error:") && (
                <p className="text-xs text-rose-600 inline-flex items-center gap-1">
                  <AlertCircle size={12} /> {regMsg.slice(6)}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditingReg(false); setRegMsg(null); }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={saveReg}
                  disabled={regSaving}
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {regSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {t("lib.save")}
                </button>
              </div>
            </div>
          ) : regEmpty ? (
            <p className="text-sm text-slate-400">
              {t("rec.regEmpty")}
            </p>
          ) : (
            <div className="text-sm text-slate-600 space-y-1">
              {reg.dateOfBirth && <p><span className="text-slate-400">{t("rec.birthLabel")}:</span> {reg.dateOfBirth.split("-").reverse().join("/")}</p>}
              {sexLabel && <p><span className="text-slate-400">{t("pat.sex")}:</span> {sexLabel}</p>}
              {reg.cpf && <p><span className="text-slate-400">{t("pat.cpf")}:</span> {reg.cpf}</p>}
              {(reg.addressLine1 || reg.city || reg.state || reg.country || reg.zipCode) && (
                <p className="inline-flex items-start gap-1">
                  <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>
                    {[reg.addressLine1, reg.city, reg.state, reg.country, reg.zipCode].filter(Boolean).join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}

          {regMsg === "saved" && !editingReg && (
            <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> {t("rec.regSaved")}
            </p>
          )}
        </div>

        {/* ── Etapa 3c: email & invite management (only meaningful when no account) ── */}
        {isOwner && !hasAccount && (
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

        {chart.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{t("rec.notes")}</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{chart.notes}</p>
          </div>
        )}
      </div>

      {!pinnedAnamnesis && chartTab === "records" && (
        <AnamnesisPromptBanner onCreate={openAnamnesisForm} readOnly={!canEdit} />
      )}

      {/* Chart tabs — scroll horizontal no celular */}
      <div className="max-w-full overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-max min-w-full sm:min-w-0">
        {([
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
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              chartTab === tab.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <tab.icon size={15} />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
        </div>
      </div>

      {chartTab === "evolution" && <MetricsEvolutionPanel chartId={chart.id} />}
      {chartTab === "diagnoses" && <DiagnosesPanel chartId={chart.id} readOnly={!canEdit} />}
      {chartTab === "vaccines" && (
        <VaccinationPanel chartId={chart.id} dateOfBirth={chart.dateOfBirth} readOnly={!canEdit} />
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
      {/* Records section */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-slate-900">{t("chartTab.records")}</h2>
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-14">
            <FileText className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-400 text-sm">
              {docs.length === 0 ? t("timeline.empty") : t("timeline.emptyFilter")}
            </p>
          </div>
        ) : (
          <div className="relative pl-8 pr-2 py-2">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" aria-hidden />
            {filteredDocs.map((d) => {
              const label = d.categoryName
                ? getCategoryLabel(lang, { name: d.categoryName })
                : legacyLabel(d.type);
              const status = shareStatus[d.id] || "";
              const isSharing = sharingId === d.id;
              const emissionKind = emissionKindFromDocType(d.type);
              const isEmission = isEmissionDoc(d);
              const parsedContent = d.content ? parseRecordContent(d.content) : null;
              const displayText = d.type === "PRESCRIPTION" && d.medications?.length
                ? d.medications.map((m, i) => `${i + 1}. ${m.name}${m.dosage ? ` — ${m.dosage}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`).join("\n")
                : d.content ? formatRecordContentForDisplay(d.content) : "";
              const isExpanded = expandedIds.has(d.id);
              const canExpand = displayText.length > CONTENT_PREVIEW_CHARS;
              const attachmentCount = d.attachmentCount ?? countRecordAttachments(d.hasFile, d.content);
              const previewText = !isExpanded && displayText.length > CONTENT_PREVIEW_CHARS
                ? `${displayText.slice(0, CONTENT_PREVIEW_CHARS).trim()}…`
                : displayText;

              function toggleExpanded() {
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(d.id)) next.delete(d.id);
                  else next.add(d.id);
                  return next;
                });
              }

              return (
                <div key={d.id} id={`record-${d.id}`} className={`relative px-3 py-4 border-b border-slate-50 last:border-0 ${
                  pinnedAnamnesis?.id === d.id ? "bg-accent-50/50 rounded-xl ring-1 ring-accent-100" : ""
                }`}>
                  <RecordTimelineDot />
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {d.type === "PRESCRIPTION" ? (
                      <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {t("timeline.filter.prescription")}
                      </span>
                    ) : d.type === "EXAM_REQUEST" ? (
                      <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border bg-cyan-50 text-cyan-700 border-cyan-200">
                        {t("doctype.EXAM_REQUEST")}
                      </span>
                    ) : d.type === "EXAM_RESULT" ? (
                      <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {t("doctype.EXAM_RESULT")}
                      </span>
                    ) : d.recordKind ? (
                      <RecordKindBadge kind={d.recordKind as ClinicalRecordKind} />
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      <Tag size={12} /> {label}
                    </span>
                    {d.categoryGroup && (
                      <span className="text-xs text-slate-400">{getCategoryGroupLabel(lang, d.categoryGroup)}</span>
                    )}
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Paperclip size={12} /> {attachmentCount} {t("rec.attachments")}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{d.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(d.createdAt).toLocaleString(
                      localeOf(lang),
                      { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                  {displayText && (
                    <p className={`text-sm text-slate-600 mt-1 whitespace-pre-wrap ${!isExpanded && displayText.length > CONTENT_PREVIEW_CHARS ? "line-clamp-3" : ""}`}>
                      {isExpanded || displayText.length <= CONTENT_PREVIEW_CHARS ? displayText : previewText}
                    </p>
                  )}
                  {attachmentCount > 0 && (
                    <RecordAttachmentStrip key={`${d.id}-${attachmentCount}`} docId={d.id} count={attachmentCount} t={t} />
                  )}
                  {d.sourceDocumentId && (
                    <p className="text-xs text-amber-600 mt-1">{t("rec.sharedReadOnly")}</p>
                  )}

                  {canExpand && (
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? t("rec.collapse") : t("rec.expand")}
                    </button>
                  )}

                  {/* Actions row */}
                  {isEmission && emissionKind ? (
                    <EmissionCardActions
                      kind={emissionKind}
                      emissionId={emissionKind === "prescription" ? (d.prescriptionId || d.id) : d.id}
                      signatureStatus={d.signatureStatus}
                      patientNotifiedAt={d.patientNotifiedAt}
                      whatsappNotifyStatus={d.whatsappNotifyStatus}
                      patientName={`${chart.firstName} ${chart.lastName}`}
                      medications={d.medications || undefined}
                      examItems={parsedContent?.items}
                      title={d.title}
                      content={d.content}
                      t={t}
                      onCopy={() => handleCopy(d, label)}
                      onPrint={() => handlePrint(d.id)}
                      onReuse={() => reuseEmissionDoc(d)}
                      onSign={canEdit ? () => signEmissionDoc(d) : undefined}
                      onPdfError={(msg) => toast.error(msg)}
                      onDelivered={() => markEmissionDelivered(d.id)}
                    />
                  ) : (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopy(d, label)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      {copiedId === d.id ? <CheckCircle2 size={14} className="text-brand-500" /> : <Copy size={14} />}
                      {copiedId === d.id ? t("rec.copied") : t("rec.copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(d.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Printer size={14} /> {t("rec.print")}
                    </button>
                    {canEdit && d.canEdit !== false && !d.sourceDocumentId && !isPsychologyStructuredContent(d.content) && (
                      <button
                        type="button"
                        onClick={() => openEditForm(d)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={14} /> {t("rec.edit")}
                      </button>
                    )}
                    <AiSummarizeButton documentId={d.id} />
                    {isOwner && (
                    <>
                    {status === "shared" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={14} /> {t("rec.shareShared")}
                      </span>
                    ) : status === "invited" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg">
                        <Mail size={14} /> {t("rec.shareInvited")}
                      </span>
                    ) : status === "needsInvite" ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                          <AlertCircle size={14} /> {t("rec.shareNeedsInvite")}
                        </span>
                        <button
                          onClick={() => handleInvite(d.id)}
                          disabled={isSharing}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                          {t("rec.sendInvite")}
                        </button>
                      </div>
                    ) : status === "noEmail" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertCircle size={14} /> {t("rec.shareNoEmail")}
                      </span>
                    ) : status.startsWith("error:") ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-600">{status.slice(6)}</span>
                        <button
                          onClick={() => handleShare(d.id)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                        >
                          {t("rec.retry")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleShare(d.id)}
                        disabled={isSharing}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                        {t("rec.shareWithPatient")}
                      </button>
                    )}
                    </>
                    )}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("kind.label")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {RECORD_KIND_OPTIONS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRecordKind(k)}
                      className={`p-2.5 rounded-xl border-2 text-left text-xs font-semibold transition ${
                        recordKind === k
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t(recordKindLabelKey(k))}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {!editingDoc && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("docs.modal.category")}</label>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 size={14} className="animate-spin" /> {t("docs.modal.loadingCategories")}
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-amber-600">{t("docs.modal.noCategories")}</p>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  >
                    {groups.map((g) => (
                      <optgroup key={g.group} label={getCategoryGroupLabel(lang, g.group)}>
                        {g.items.map((c) => (
                          <option key={c.id} value={c.id}>{getCategoryLabel(lang, { slug: c.slug, name: c.name })}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              )}
              {editingDoc && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("kind.label")}</label>
                <select
                  value={recordKind}
                  onChange={(e) => setRecordKind(e.target.value as ClinicalRecordKind)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                >
                  {RECORD_KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>{t(recordKindLabelKey(k))}</option>
                  ))}
                </select>
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.descLabel")}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
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
    </div>
  );
}
