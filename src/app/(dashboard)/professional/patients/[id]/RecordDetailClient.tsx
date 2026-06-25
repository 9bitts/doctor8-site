"use client";

// src/app/(dashboard)/professional/patients/[id]/RecordDetailClient.tsx
// Chart detail + add clinical record (title + text + optional file upload to S3).
// Phase 4B: the category selector is now dynamic (grouped categories from the DB).
// Etapa 3c: edit the chart's email (only when no account) + resend prescription invite.
// P1-b: edit the chart's registration data (birth, sex, cpf, address) used by the prescription.
// P2: "Diagnóstico / Título" label (trilíngue) + botão WhatsApp no cabeçalho da ficha.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, FileText, Paperclip, CheckCircle2, AlertCircle,
  Share2, Mail, Loader2, Tag, Pencil, Send, MapPin, MessageCircle, ExternalLink,
  Copy, Printer, RotateCw, ChevronDown, ChevronUp, FileType, Film,
} from "lucide-react";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import ReferralPanel from "@/components/professional/ReferralPanel";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/category-i18n";
import {
  buildRecordCopyText, formatRecordContentForDisplay, parseRecordContent,
  isPsychologyStructuredContent, countRecordAttachments,
} from "@/lib/record-content";
import { isImageFile, rotateImageFile } from "@/lib/image-rotate";

// P2: inline texts for rec.* keys (not yet in translations.ts)
const REC_TEXTS: Record<string, Record<string, string>> = {
  titleLabel:       { pt: "Título complementar", en: "Additional title", es: "Título complementario" },
  titlePlaceholder: { pt: "opcional — assunto extra do registro", en: "optional — extra subject for this record", es: "opcional — asunto adicional del registro" },
  whatsapp:         { pt: "Abrir WhatsApp", en: "Open WhatsApp", es: "Abrir WhatsApp" },
  errCid:           { pt: "Selecione um CID para o registro.", en: "Select an ICD code for this record.", es: "Seleccione un CIE para el registro." },
  errCategory:      { pt: "Escolha uma categoria.", en: "Please choose a category.", es: "Elige una categoría." },
  sendMessage:      { pt: "Enviar mensagem", en: "Send message", es: "Enviar mensaje" },
  verConv:          { pt: "Ver conversa", en: "View conversation", es: "Ver conversación" },
  copy:             { pt: "Copiar texto", en: "Copy text", es: "Copiar texto" },
  copied:           { pt: "Copiado!", en: "Copied!", es: "¡Copiado!" },
  print:            { pt: "Imprimir", en: "Print", es: "Imprimir" },
  edit:             { pt: "Editar", en: "Edit", es: "Editar" },
  sharedReadOnly:   { pt: "Compartilhado pelo paciente — somente leitura", en: "Shared by patient — read only", es: "Compartido por el paciente — solo lectura" },
  rotateLeft:       { pt: "Girar esquerda", en: "Rotate left", es: "Girar izquierda" },
  rotateRight:      { pt: "Girar direita", en: "Rotate right", es: "Girar derecha" },
  editRecord:       { pt: "Editar registro", en: "Edit record", es: "Editar registro" },
  saveChanges:      { pt: "Salvar alterações", en: "Save changes", es: "Guardar cambios" },
  expand:           { pt: "Ver detalhes", en: "View details", es: "Ver detalles" },
  collapse:         { pt: "Recolher", en: "Collapse", es: "Contraer" },
  attachments:      { pt: "anexos", en: "attachments", es: "adjuntos" },
  attachLoading:    { pt: "Carregando anexos…", en: "Loading attachments…", es: "Cargando adjuntos…" },
  openFile:         { pt: "Abrir arquivo", en: "Open file", es: "Abrir archivo" },
};

interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  hasAccount: boolean;
  linkedUserId: string | null;
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
  categoryName: string | null;
  categoryGroup: string | null;
  title: string;
  content: string | null;
  hasFile: boolean;
  attachmentCount?: number;
  createdAt: string;
  sourceDocumentId?: string | null;
  canEdit?: boolean;
}

type RecordFilePreview = {
  index: number;
  url: string;
  name: string;
  kind: "image" | "pdf" | "video" | "other";
};

const CONTENT_PREVIEW_CHARS = 160;

function RecordAttachmentStrip({
  docId,
  count,
  rt,
}: {
  docId: string;
  count: number;
  rt: (k: string) => string;
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
          <Loader2 size={12} className="animate-spin" /> {rt("attachLoading")}
        </p>
      )}
      {error && !loading && (
        <p className="text-xs text-rose-500">{rt("attachLoading")}</p>
      )}
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin max-w-full">
          {files.map((f) => (
            <a
              key={f.index}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              title={f.name || rt("openFile")}
              className="flex-shrink-0 snap-start w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-brand-300 hover:ring-2 hover:ring-brand-100 transition"
            >
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-slate-500">
                  {f.kind === "pdf" ? <FileType size={22} /> : f.kind === "video" ? <Film size={22} /> : <Paperclip size={22} />}
                  <span className="text-[9px] text-center leading-tight line-clamp-2 px-0.5">{f.name}</span>
                </div>
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
}: {
  chart: Chart;
  initialDocuments: Doc[];
}) {
  const { lang, t } = useI18n();
  const searchParams = useSearchParams();
  // Detect current language via a known key, then serve inline rec.* texts
  const _lang = t("common.cancel") === "Cancelar" ? "pt" : t("common.cancel") === "Cancelar" ? "es" : t("common.cancel") === "Cancel" ? "en" : "en";
  const _langFull = t("greeting.morning") === "Bom dia" ? "pt" : t("greeting.morning") === "Buenos días" ? "es" : "en";
  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");
  const rt = (key: string) => REC_TEXTS[key]?.[_langFull] ?? REC_TEXTS[key]?.["en"] ?? key;
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
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

  // Form fields
  const [categoryId, setCategoryId] = useState("");
  const [cidSelection, setCidSelection] = useState<CidSelection | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

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
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (searchParams.get("newRecord") === "1") {
      setShowForm(true);
    }
  }, [searchParams]);

  function resetForm() {
    const first = groups[0]?.items[0];
    setCategoryId(first ? first.id : "");
    setCidSelection(null);
    setTitle("");
    setContent("");
    setFiles([]);
    setImagePreview(null);
    setError(null);
    setEditingDoc(null);
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
    setShowForm(true);
  }

  async function uploadRecordFile(f: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("folder", `records/${chart.id}`);
    const up = await fetch("/api/uploads", { method: "POST", body: fd });
    const upData = await up.json();
    if (!up.ok) {
      setError(upData.error || "File upload failed.");
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
      setError("Could not rotate image.");
    }
    setRotating(false);
  }

  function handleFilesChange(fileList: FileList | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const picked = fileList ? Array.from(fileList) : [];
    const next = editingDoc ? picked.slice(0, 1) : picked;
    setFiles(next);
    const firstImage = next.find((f) => isImageFile(f));
    setImagePreview(firstImage ? URL.createObjectURL(firstImage) : null);
  }

  async function handleCopy(doc: Doc, label: string) {
    const locale = _langFull === "pt" ? "pt-BR" : _langFull === "es" ? "es-ES" : "en-US";
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

  function handlePrint(docId: string) {
    window.open(`/api/professional/documents/${docId}/pdf`, "_blank", "noopener,noreferrer");
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
        setEmailMsg("error:" + (typeof data.error === "string" ? data.error : "Failed to update email"));
      } else {
        setChartEmail(data.email);
        setHasAccount(!!data.hasAccount);
        setEditingEmail(false);
        setEmailMsg(data.hasAccount ? "linked" : "saved");
      }
    } catch {
      setEmailMsg("error:Network error");
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
        setRegMsg("error:" + (typeof data.error === "string" ? data.error : "Failed to save"));
      } else {
        setReg(regDraft);
        setEditingReg(false);
        setRegMsg("saved");
      }
    } catch {
      setRegMsg("error:Network error");
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
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg("error:" + (typeof data.error === "string" ? data.error : "Failed to send invite"));
      } else {
        setInviteMsg("sent");
      }
    } catch {
      setInviteMsg("error:Network error");
    }
    setInviteSending(false);
  }

  async function handleShare(docId: string) {
    setSharingId(docId);
    setShareStatus((s) => ({ ...s, [docId]: "" }));
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || "Failed") }));
      } else if (data.shared) {
        setShareStatus((s) => ({ ...s, [docId]: "shared" }));
      } else if (data.needsInvite) {
        setShareStatus((s) => ({ ...s, [docId]: data.hasEmail ? "needsInvite" : "noEmail" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:Network error" }));
    }
    setSharingId(null);
  }

  async function handleInvite(docId: string) {
    setSharingId(docId);
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || "Failed") }));
      } else if (data.invited) {
        setShareStatus((s) => ({ ...s, [docId]: "invited" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:Network error" }));
    }
    setSharingId(null);
  }

  async function handleCreate() {
    if (!cidSelection) {
      setError(rt("errCid"));
      return;
    }
    if (!categoryId) {
      setError(rt("errCategory"));
      return;
    }
    setSaving(true);
    setError(null);

    const baseTitle = title.trim()
      ? `${cidSelection.code} — ${title.trim()}`
      : `${cidSelection.code} — ${cidSelection.description}`;

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
          cid: cidSelection.code,
          cidLabel: cidSelection.description,
          ...(fileKeys.length === 1 ? { fileKey: fileKeys[0] } : {}),
          ...(fileKeys.length > 0 ? { fileKeys } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create record.");
        setSaving(false);
        return;
      }

      setDocs((prev) => [
        {
          id: data.id,
          type: data.type,
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
      resetForm();
      setShowForm(false);
    } catch {
      setError("Network error. Try again.");
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingDoc) return;
    if (!cidSelection && !title.trim()) {
      setError(rt("errCid"));
      return;
    }
    setSaving(true);
    setError(null);

    const recordTitle = cidSelection
      ? (title.trim()
        ? `${cidSelection.code} — ${title.trim()}`
        : `${cidSelection.code} — ${cidSelection.description}`)
      : title.trim();

    try {
      let fileKey: string | undefined;
      if (files.length > 0) {
        const key = await uploadRecordFile(files[0]);
        if (!key) {
          setSaving(false);
          return;
        }
        fileKey = key;
      }

      const res = await fetch(`/api/professional/documents/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recordTitle,
          content,
          cid: cidSelection?.code || "",
          cidLabel: cidSelection?.description || "",
          ...(fileKey ? { fileKey } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update record.");
        setSaving(false);
        return;
      }

      setDocs((prev) => prev.map((d) => (d.id === editingDoc.id ? { ...d, ...data } : d)));
      resetForm();
      setShowForm(false);
    } catch {
      setError("Network error. Try again.");
    }
    setSaving(false);
  }

  // Helper: is the registration data essentially empty?
  const regEmpty = !reg.dateOfBirth && !reg.addressLine1 && !reg.city && !reg.cpf && !reg.sex;
  const sexLabel = reg.sex === "F" ? "Feminino" : reg.sex === "M" ? "Masculino" : reg.sex === "O" ? "Outro" : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/professional/patients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Back to patients
      </Link>

      {/* Chart header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-lg shrink-0">
            {chart.firstName[0]}{chart.lastName[0]}
          </div>
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
                    title={rt("whatsapp")}
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
                  <CheckCircle2 size={12} /> Has Doctor8 account
                </span>
              ) : (
                <span className="text-amber-600 inline-flex items-center gap-1">
                  <AlertCircle size={12} /> No account yet
                </span>
              )}
            </p>
            {/* P4: message buttons — only when patient has an account */}
            {chart.linkedUserId && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <a
                  href={`/professional/messages?with=${chart.linkedUserId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition"
                >
                  <MessageCircle size={13} /> {rt("sendMessage")}
                </a>
                {hasConversation && (
                  <a
                    href={`/professional/messages?with=${chart.linkedUserId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <ExternalLink size={13} /> {rt("verConv")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <ReferralPanel chartId={chart.id} />
        </div>

        {/* ── P1-b: registration data (for the prescription) ── */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Dados para a receita</p>
            {!editingReg && (
              <button
                onClick={openRegEditor}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil size={13} /> {regEmpty ? "Adicionar dados" : "Editar dados"}
              </button>
            )}
          </div>

          {editingReg ? (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data de nascimento</label>
                  <input
                    type="date"
                    value={regDraft.dateOfBirth}
                    onChange={(e) => setRegDraft({ ...regDraft, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sexo</label>
                  <select
                    value={regDraft.sex}
                    onChange={(e) => setRegDraft({ ...regDraft, sex: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CPF <span className="text-slate-400">(opcional)</span></label>
                <input
                  value={regDraft.cpf}
                  onChange={(e) => setRegDraft({ ...regDraft, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                <input
                  value={regDraft.addressLine1}
                  onChange={(e) => setRegDraft({ ...regDraft, addressLine1: e.target.value })}
                  placeholder="Rua, número, complemento"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                  <input
                    value={regDraft.city}
                    onChange={(e) => setRegDraft({ ...regDraft, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <input
                    value={regDraft.state}
                    onChange={(e) => setRegDraft({ ...regDraft, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">País</label>
                  <input
                    value={regDraft.country}
                    onChange={(e) => setRegDraft({ ...regDraft, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
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
                  Cancelar
                </button>
                <button
                  onClick={saveReg}
                  disabled={regSaving}
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {regSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Salvar
                </button>
              </div>
            </div>
          ) : regEmpty ? (
            <p className="text-sm text-slate-400">
              Nenhum dado cadastral ainda. Eles são usados na emissão da receita.
            </p>
          ) : (
            <div className="text-sm text-slate-600 space-y-1">
              {reg.dateOfBirth && <p><span className="text-slate-400">Nascimento:</span> {reg.dateOfBirth.split("-").reverse().join("/")}</p>}
              {sexLabel && <p><span className="text-slate-400">Sexo:</span> {sexLabel}</p>}
              {reg.cpf && <p><span className="text-slate-400">CPF:</span> {reg.cpf}</p>}
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
              <CheckCircle2 size={12} /> Dados salvos.
            </p>
          )}
        </div>

        {/* ── Etapa 3c: email & invite management (only meaningful when no account) ── */}
        {!hasAccount && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Patient access</p>

            {editingEmail ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">Email</label>
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
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingEmail(false); setEmailDraft(chartEmail || ""); setEmailMsg(null); }}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-700">
                  {chartEmail ? chartEmail : <span className="text-slate-400">No email on file</span>}
                </span>
                <button
                  onClick={() => { setEditingEmail(true); setEmailMsg(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Pencil size={13} /> {chartEmail ? "Edit email" : "Add email"}
                </button>

                {chartEmail && (
                  <button
                    onClick={resendInvite}
                    disabled={inviteSending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {inviteSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send invite
                  </button>
                )}
              </div>
            )}

            {/* messages */}
            {emailMsg === "saved" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Email updated.
              </p>
            )}
            {emailMsg === "linked" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Email updated and linked to an existing account.
              </p>
            )}
            {emailMsg?.startsWith("error:") && (
              <p className="text-xs text-rose-600 mt-2 inline-flex items-center gap-1">
                <AlertCircle size={12} /> {emailMsg.slice(6)}
              </p>
            )}
            {inviteMsg === "sent" && (
              <p className="text-xs text-brand-500 mt-2 inline-flex items-center gap-1">
                <Mail size={12} /> Invite sent to {chartEmail}.
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
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{chart.notes}</p>
          </div>
        )}
      </div>

      {/* Records section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Clinical records</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> Add record
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {docs.length === 0 ? (
          <div className="text-center py-14">
            <FileText className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-400 text-sm">No records yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((d) => {
              const label = d.categoryName
                ? getCategoryLabel(lang, { name: d.categoryName })
                : legacyLabel(d.type);
              const status = shareStatus[d.id] || "";
              const isSharing = sharingId === d.id;
              const displayText = d.content ? formatRecordContentForDisplay(d.content) : "";
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
                <div key={d.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      <Tag size={12} /> {label}
                    </span>
                    {d.categoryGroup && (
                      <span className="text-xs text-slate-400">{getCategoryGroupLabel(lang, d.categoryGroup)}</span>
                    )}
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Paperclip size={12} /> {attachmentCount} {rt("attachments")}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{d.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(d.createdAt).toLocaleString(
                      _langFull === "pt" ? "pt-BR" : _langFull === "es" ? "es-ES" : "en-US",
                      { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                  {displayText && (
                    <p className={`text-sm text-slate-600 mt-1 whitespace-pre-wrap ${!isExpanded && displayText.length > CONTENT_PREVIEW_CHARS ? "line-clamp-3" : ""}`}>
                      {isExpanded || displayText.length <= CONTENT_PREVIEW_CHARS ? displayText : previewText}
                    </p>
                  )}
                  {attachmentCount > 0 && (
                    <RecordAttachmentStrip docId={d.id} count={attachmentCount} rt={rt} />
                  )}
                  {d.sourceDocumentId && (
                    <p className="text-xs text-amber-600 mt-1">{rt("sharedReadOnly")}</p>
                  )}

                  {canExpand && (
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? rt("collapse") : rt("expand")}
                    </button>
                  )}

                  {/* Actions row */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopy(d, label)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      {copiedId === d.id ? <CheckCircle2 size={14} className="text-brand-500" /> : <Copy size={14} />}
                      {copiedId === d.id ? rt("copied") : rt("copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(d.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Printer size={14} /> {rt("print")}
                    </button>
                    {d.canEdit !== false && !d.sourceDocumentId && !isPsychologyStructuredContent(d.content) && (
                      <button
                        type="button"
                        onClick={() => openEditForm(d)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={14} /> {rt("edit")}
                      </button>
                    )}
                    <AiSummarizeButton documentId={d.id} />
                    {status === "shared" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={14} /> Shared with patient
                      </span>
                    ) : status === "invited" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg">
                        <Mail size={14} /> Invitation sent
                      </span>
                    ) : status === "needsInvite" ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                          <AlertCircle size={14} /> Patient has no account yet
                        </span>
                        <button
                          onClick={() => handleInvite(d.id)}
                          disabled={isSharing}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                          Send invite email
                        </button>
                      </div>
                    ) : status === "noEmail" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertCircle size={14} /> No account and no email on file — add an email to the chart to invite
                      </span>
                    ) : status.startsWith("error:") ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-600">{status.slice(6)}</span>
                        <button
                          onClick={() => handleShare(d.id)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleShare(d.id)}
                        disabled={isSharing}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                        Share with patient
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / edit record modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">
                {editingDoc ? rt("editRecord") : "New clinical record"}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!editingDoc && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 size={14} className="animate-spin" /> Loading categories...
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-amber-600">No categories available.</p>
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
              <CidSearchInput
                value={cidSelection}
                onChange={setCidSelection}
                required={!editingDoc}
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {cidSelection ? rt("titleLabel") : `${rt("titleLabel")} *`}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={rt("titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Attachment <span className="text-slate-400">(PDF, image or video — max 50MB{editingDoc ? "" : ", multiple allowed"})</span>
                </label>
                {editingDoc?.hasFile && files.length === 0 && (
                  <p className="text-xs text-slate-500 mb-2">This record already has an attachment. Choose a file below to replace it.</p>
                )}
                <input
                  type="file"
                  multiple={!editingDoc}
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
                        {rt("rotateLeft")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotateImage("right")}
                        disabled={rotating}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        {rotating ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                        {rt("rotateRight")}
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
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingDoc ? handleUpdate : handleCreate}
                  disabled={saving || (!editingDoc && categoriesLoading)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingDoc ? rt("saveChanges") : "Save record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
