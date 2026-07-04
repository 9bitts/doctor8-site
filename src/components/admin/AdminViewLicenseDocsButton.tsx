"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon, Loader2, X, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type LicenseDoc = {
  id: string;
  label: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  viewUrl: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminViewLicenseDocsButton({
  userId,
  licenseDocCount,
}: {
  userId: string;
  licenseDocCount: number;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState<LicenseDoc[] | null>(null);
  const [error, setError] = useState("");

  if (licenseDocCount <= 0) return null;

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/providers/${userId}/license-documents`);
      const data = await res.json();
      if (!res.ok) {
        setError(t("admin.providers.docsLoadFail"));
        return;
      }
      const docs: LicenseDoc[] = data.documents || [];
      if (!docs.length) {
        setError(t("admin.providers.docsEmpty"));
        return;
      }
      setDocuments(docs);
    } catch {
      setError(t("admin.providers.docsLoadFail"));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDocuments(null);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        {t("admin.providers.viewDocs").replace("{{n}}", String(licenseDocCount))}
      </button>

      {(documents || error) && (
        <div
          className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{t("admin.providers.docsTitle")}</h3>
              <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : documents ? (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
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
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
