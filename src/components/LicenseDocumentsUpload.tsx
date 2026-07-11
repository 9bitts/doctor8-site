"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Award,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  isPsychoanalystVariant,
  variantI18nKey,
  type ProviderSettingsVariant,
} from "@/lib/provider-settings-variant";

type LicenseDoc = {
  id: string;
  label: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  viewUrl?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LicenseDocumentsUpload({
  incomplete = false,
  variant,
}: {
  incomplete?: boolean;
  variant?: ProviderSettingsVariant;
}) {
  const { t } = useI18n();
  const isPa = isPsychoanalystVariant(variant);
  const tk = (defaultKey: string, paKey: string) =>
    t(variantI18nKey(variant, defaultKey, paKey));
  const labelPresets = isPa
    ? [
        t("pa.licenseDocs.chip.certificate"),
        t("pa.licenseDocs.chip.affiliation"),
        t("pa.licenseDocs.chip.institute"),
      ]
    : [t("licenseDocs.front"), t("licenseDocs.back")];
  const iconAccent = isPa ? "text-violet-500" : "text-brand-500";
  const btnClass = isPa
    ? "bg-violet-600 hover:bg-violet-700"
    : "bg-brand-500 hover:bg-brand-400";
  const chipActive = isPa
    ? "bg-violet-50 border-violet-200 text-violet-700"
    : "bg-brand-50 border-brand-200 text-brand-700";
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<LicenseDoc[]>([]);
  const [maxDocuments, setMaxDocuments] = useState(20);
  const [label, setLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/provider/license-documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("licenseDocs.errLoad"));
      setDocuments(data.documents || []);
      setMaxDocuments(data.maxDocuments || 20);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("licenseDocs.errLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (documents.length + list.length > maxDocuments) {
      setError(t("licenseDocs.maxReached").replace("{max}", String(maxDocuments)));
      return;
    }

    setUploading(true);
    setError("");
    setUploadSuccess(false);

    try {
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        if (label.trim()) form.append("label", label.trim());

        const res = await fetch("/api/provider/license-documents", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("licenseDocs.errUpload"));
      }
      setLabel("");
      setUploadSuccess(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("licenseDocs.errUpload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/provider/license-documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("licenseDocs.errDelete"));
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("licenseDocs.errDelete"));
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = documents.length >= maxDocuments;

  return (
    <div
      id="registration-verification-documents"
      className={`bg-white rounded-2xl shadow-sm p-6 space-y-4 scroll-mt-24 ${
        incomplete
          ? "border-2 border-red-400 ring-1 ring-red-200/80 bg-red-50/30"
          : "border border-slate-100"
      }`}
    >
      <div>
        <h2
          className={`font-semibold flex items-center gap-2 ${
            incomplete ? "text-red-700" : "text-slate-800"
          }`}
        >
          <Award size={18} className={incomplete ? "text-red-500 shrink-0" : `${iconAccent} shrink-0`} />
          {tk("licenseDocs.title", "pa.licenseDocs.title")}
          {incomplete && (
            <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide ml-1">
              {t("reg.incompleteSection")}
            </span>
          )}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{tk("licenseDocs.subtitle", "pa.licenseDocs.subtitle")}</p>
        <p className="text-xs text-slate-400 mt-1">{t("licenseDocs.types")}</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {uploadSuccess && !error && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {t("licenseDocs.uploadSuccess")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <Loader2 size={16} className="animate-spin" />
          {t("common.loading")}
        </div>
      ) : (
        <>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              {t("licenseDocs.empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50/50"
                >
                  {doc.mimeType === "application/pdf" ? (
                    <FileText size={18} className="text-rose-500 shrink-0" />
                  ) : (
                    <ImageIcon size={18} className="text-sky-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {doc.label ? `${doc.label} · ` : ""}
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</p>
                  </div>
                  {doc.viewUrl && (
                    <a
                      href={doc.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink size={12} />
                      {t("licenseDocs.view")}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-50 shrink-0 p-1"
                    title={t("licenseDocs.delete")}
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t("licenseDocs.labelOptional")}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {labelPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLabel(preset)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      label === preset ? chipActive : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isPa ? "focus:ring-violet-500/40" : "focus:ring-brand-500/40"
                }`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={tk("licenseDocs.labelPlaceholder", "pa.licenseDocs.labelPlaceholder")}
                maxLength={80}
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
              }}
            />

            <button
              type="button"
              disabled={uploading || atLimit}
              onClick={() => fileRef.current?.click()}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 ${btnClass} disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition`}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {uploading ? t("licenseDocs.uploading") : t("licenseDocs.upload")}
            </button>

            {atLimit && (
              <p className="text-xs text-amber-700">
                {t("licenseDocs.maxReached").replace("{max}", String(maxDocuments))}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
