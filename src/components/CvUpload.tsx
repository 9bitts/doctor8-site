"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

type CvInfo = {
  fileName: string | null;
  fileSize: number | null;
  viewUrl?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CvUpload() {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [cv, setCv] = useState<CvInfo | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/provider/cv");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("cvDocs.errLoad"));
      setCv(data.cv || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cvDocs.errLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    setUploadSuccess(false);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/provider/cv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("cvDocs.errUpload"));

      setCv(data.cv || null);
      setUploadSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cvDocs.errUpload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/provider/cv", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("cvDocs.errDelete"));
      }
      setCv(null);
      setUploadSuccess(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cvDocs.errDelete"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={18} className="text-brand-500 shrink-0" />
          {t("cvDocs.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("cvDocs.subtitle")}</p>
        <p className="text-xs text-slate-400 mt-1">{t("cvDocs.types")}</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {uploadSuccess && !error && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {t("cvDocs.uploadSuccess")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <Loader2 size={16} className="animate-spin" />
          {t("common.loading")}
        </div>
      ) : (
        <>
          {!cv?.fileName ? (
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              {t("cvDocs.empty")}
            </p>
          ) : (
            <div className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50/50">
              <FileText size={18} className="text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{cv.fileName}</p>
                {cv.fileSize != null && (
                  <p className="text-xs text-slate-400">{formatBytes(cv.fileSize)}</p>
                )}
              </div>
              {cv.viewUrl && (
                <a
                  href={cv.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <ExternalLink size={12} />
                  {t("cvDocs.view")}
                </a>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-slate-400 hover:text-rose-600 disabled:opacity-50 shrink-0 p-1"
                title={t("cvDocs.delete")}
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          )}

          <div className="pt-1 border-t border-slate-100">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {uploading
                ? t("cvDocs.uploading")
                : cv?.fileName
                  ? t("cvDocs.replace")
                  : t("cvDocs.upload")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
