"use client";

import { useState } from "react";
import { X, Link2, Paperclip, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import type { LibraryResourceDto, ResourceCategory } from "@/lib/professional-library/types";

interface ResourceFormModalProps {
  apiBase: string;
  resource: LibraryResourceDto | null;
  categories: ResourceCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ResourceFormModal({
  apiBase,
  resource,
  categories,
  onClose,
  onSaved,
}: ResourceFormModalProps) {
  const { t } = useI18n();
  const toast = useToast();

  const [title, setTitle] = useState(resource?.title ?? "");
  const [content, setContent] = useState(resource?.content ?? "");
  const [formType, setFormType] = useState<"link" | "file" | "text">(
    resource?.contentType === "text" ? "text" : resource?.url ? "link" : resource?.hasFile ? "file" : "link",
  );
  const [url, setUrl] = useState(resource?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(resource?.category ?? "general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) { setError(t("lib.errTitle")); return; }
    if (formType === "link" && url.trim() && !/^https?:\/\/.+/i.test(url.trim())) {
      setError(t("lib.errUrl"));
      return;
    }
    if (formType === "text" && !content.trim()) {
      setError(t("lib.errContent"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let fileKey = "";
      if (formType === "file" && file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "resources");
        const up = await fetch("/api/uploads", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) { setError(upData.error || t("lib.errUpload")); setSaving(false); return; }
        fileKey = upData.key;
      }

      const payload = {
        title: title.trim(),
        content: content.trim(),
        url: formType === "link" ? url.trim() : "",
        category,
        contentType: formType,
        ...(fileKey ? { fileKey } : {}),
      };

      const res = await fetch(
        resource ? `${apiBase}/resources/${resource.id}` : `${apiBase}/resources`,
        {
          method: resource ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("lib.errGeneric"));
        setSaving(false);
        return;
      }
      toast.success(t("toast.saveSuccess"));
      onSaved();
    } catch {
      setError(t("rec.networkError"));
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">{resource ? t("lib.editModalTitle") : t("lib.modalTitle")}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.titleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("lib.titlePlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("libHub.filterAll").replace("Todas as ", "")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ResourceCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{t(`libHub.category.${c}`)}</option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
            {(["link", "file", "text"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormType(type)}
                className={`flex-1 py-2 flex items-center justify-center gap-1 transition
                  ${formType === type ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {type === "link" ? <Link2 size={14} /> : type === "file" ? <Paperclip size={14} /> : null}
                {t(type === "text" ? "libHub.typeText" : type === "link" ? "lib.typeLink" : "lib.typeFile")}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {formType === "text" ? t("lib.contentLabel") : t("lib.descLabel")}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("lib.descPlaceholder")}
              rows={formType === "text" ? 6 : 3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:border-brand-400"
            />
          </div>

          {formType === "link" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.urlLabel")}</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("lib.urlPlaceholder")}
                type="url"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400"
              />
            </div>
          )}

          {formType === "file" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.fileLabel")}</label>
              {resource?.hasFile && !file && (
                <p className="text-xs text-slate-500 mb-2">{t("lib.keepExistingFile")}</p>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600"
              />
            </div>
          )}

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
              {t("lib.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? t("lib.saving") : t("lib.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
