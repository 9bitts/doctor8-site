"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, FileText,
  Loader2, Mail, Paperclip, Pencil, Printer, Share2, Tag,
} from "lucide-react";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { EmissionCardActions } from "@/components/professional/emissions/EmissionCardActions";
import type { EmissionKind } from "@/components/professional/emissions/EmissionsSignModal";
import { RecordFileThumbnail } from "@/components/professional/RecordFileThumbnail";
import { RecordKindBadge } from "@/components/professional/PatientRecordTimeline";
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/category-i18n";
import { openAuthenticatedBlob } from "@/lib/open-url-safely";
import {
  countRecordAttachments,
  formatRecordContentForDisplay,
  isPsychologyStructuredContent,
  parseRecordContent,
} from "@/lib/record-content";
import type { ClinicalRecordKind } from "@/lib/record-kind";
import { localeOf, type Lang } from "@/lib/i18n/translations";

type RecordFilePreview = {
  index: number;
  url: string;
  name: string;
  kind: "image" | "pdf" | "video" | "other";
};

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
        <p className="text-xs text-rose-500">{t("rec.attachError")}</p>
      )}
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin max-w-full">
          {files.map((f) => (
            <button
              key={f.index}
              type="button"
              onClick={() => {
                if (f.url.startsWith("/api/")) {
                  void openAuthenticatedBlob(f.url).catch(() => {});
                } else {
                  window.open(f.url, "_blank", "noopener,noreferrer");
                }
              }}
              title={f.name || t("rec.openFile")}
              className="flex-shrink-0 snap-start w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-brand-300 hover:ring-2 hover:ring-brand-100 transition"
            >
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <RecordFileThumbnail kind={f.kind} name={f.name} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type ChartListDoc = {
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
};

const CONTENT_PREVIEW_CHARS = 160;

function emissionKindFromDocType(type: string): EmissionKind | null {
  if (type === "PRESCRIPTION") return "prescription";
  if (type === "EXAM_REQUEST" || type === "EXAM_RESULT") return "exam";
  if (["CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER"].includes(type)) return "document";
  return null;
}

export default function ChartDocsList({
  docs,
  totalDocs,
  lang,
  t,
  legacyLabel,
  pinnedAnamnesisId,
  expandedIds,
  setExpandedIds,
  shareStatus,
  sharingId,
  copiedId,
  canEdit,
  patientName,
  onCopy,
  onPrint,
  onEdit,
  onShare,
  onInvite,
  onReuse,
  onSign,
  onDelivered,
  onPdfError,
  compact = false,
}: {
  docs: ChartListDoc[];
  totalDocs: number;
  lang: Lang;
  t: (k: string) => string;
  legacyLabel: (type: string) => string;
  pinnedAnamnesisId?: string | null;
  expandedIds: Set<string>;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
  shareStatus: Record<string, string>;
  sharingId: string | null;
  copiedId: string | null;
  canEdit: boolean;
  patientName: string;
  onCopy: (d: ChartListDoc, label: string) => void;
  onPrint: (id: string) => void;
  onEdit: (d: ChartListDoc) => void;
  onShare: (id: string) => void;
  onInvite: (id: string) => void;
  onReuse: (d: ChartListDoc) => void;
  onSign: (d: ChartListDoc) => void;
  onDelivered: (id: string) => void;
  onPdfError: (msg: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${compact ? "" : ""}`}>
      {docs.length === 0 ? (
        <div className={`text-center ${compact ? "py-8" : "py-14"}`}>
          <FileText className="mx-auto text-slate-300 mb-3" size={compact ? 28 : 36} />
          <p className="text-slate-400 text-sm">
            {totalDocs === 0 ? t("timeline.empty") : t("timeline.emptyFilter")}
          </p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">
          {docs.map((d) => {
            const label = d.categoryName
              ? getCategoryLabel(lang, { name: d.categoryName })
              : legacyLabel(d.type);
            const status = shareStatus[d.id] || "";
            const isSharing = sharingId === d.id;
            const emissionKind = emissionKindFromDocType(d.type);
            const isEmission = emissionKind !== null;
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
              <div
                key={d.id}
                id={`record-${d.id}`}
                className={`relative px-4 py-4 rounded-2xl border shadow-sm ${
                  pinnedAnamnesisId === d.id
                    ? "bg-accent-50/50 border-accent-200 ring-1 ring-accent-100"
                    : "bg-white border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-400 shrink-0" aria-hidden />
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
                    { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
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

                {isEmission && emissionKind ? (
                  <EmissionCardActions
                    kind={emissionKind}
                    emissionId={emissionKind === "prescription" ? (d.prescriptionId || d.id) : d.id}
                    signatureStatus={d.signatureStatus}
                    patientNotifiedAt={d.patientNotifiedAt}
                    whatsappNotifyStatus={d.whatsappNotifyStatus}
                    patientName={patientName}
                    medications={d.medications || undefined}
                    examItems={parsedContent?.items}
                    title={d.title}
                    content={d.content}
                    t={t}
                    onCopy={() => onCopy(d, label)}
                    onPrint={() => onPrint(d.id)}
                    onReuse={() => onReuse(d)}
                    onSign={canEdit ? () => onSign(d) : undefined}
                    onPdfError={onPdfError}
                    onDelivered={() => onDelivered(d.id)}
                  />
                ) : (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onCopy(d, label)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      {copiedId === d.id ? <CheckCircle2 size={14} className="text-brand-500" /> : <Copy size={14} />}
                      {copiedId === d.id ? t("rec.copied") : t("rec.copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrint(d.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Printer size={14} /> {t("rec.print")}
                    </button>
                    {canEdit && d.canEdit !== false && !d.sourceDocumentId && !isPsychologyStructuredContent(d.content) && (
                      <button
                        type="button"
                        onClick={() => onEdit(d)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={14} /> {t("rec.edit")}
                      </button>
                    )}
                    <AiSummarizeButton documentId={d.id} />
                    {canEdit && (
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
                              onClick={() => onInvite(d.id)}
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
                              onClick={() => onShare(d.id)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
                            >
                              {t("rec.retry")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onShare(d.id)}
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
  );
}
