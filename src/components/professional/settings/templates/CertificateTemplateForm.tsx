"use client";

import { useState } from "react";
import { Trash2, Loader2, Check, X, Plus } from "lucide-react";
import { TEMPLATE_TAG_HINTS } from "@/lib/template-tags";
import { TEMPLATE_CATEGORIES } from "@/lib/clinical-template-utils";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export interface CertificateTemplateData {
  id: string;
  name: string;
  title: string;
  body: string;
}

interface CertificateTemplateFormProps {
  editing?: CertificateTemplateData | null;
  t: (k: string) => string;
  onSaved: () => void;
  onCancel: () => void;
}

export function CertificateTemplateForm({
  editing,
  t,
  onSaved,
  onCancel,
}: CertificateTemplateFormProps) {
  const [name, setName] = useState(editing?.name || "");
  const [title, setTitle] = useState(editing?.title || t("tmpl.certificateDefaultTitle"));
  const [body, setBody] = useState(editing?.body || t("tmpl.certificateDefaultBody"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim() || !title.trim() || !body.trim()) {
      setError(t("tmpl.fillRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        documentType: "CERTIFICATE" as const,
        templateCategory: TEMPLATE_CATEGORIES.CERTIFICATE,
        title: title.trim(),
        body: body.trim(),
      };
      const res = editing
        ? await fetch(`/api/professional/templates/documents/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/professional/templates/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tmpl.saveError"));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tmpl.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("tmpl.templateName")}</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t("tmpl.certificateNamePlaceholder")} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentTitleLabel")}</label>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <p className="text-xs text-slate-500">
        {t("tmpl.tagsHint")}{" "}
        {TEMPLATE_TAG_HINTS.map((tag) => (
          <code key={tag} className="bg-slate-100 px-1 rounded mx-0.5">{tag}</code>
        ))}
      </p>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentBody")}</label>
        <textarea className={inputClass + " resize-y min-h-[200px]"} value={body}
          onChange={(e) => setBody(e.target.value)} rows={10} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 flex items-center gap-1">
          <X size={14} /> {t("common.cancel")}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {editing ? t("tmpl.saveChanges") : t("tmpl.createTemplate")}
        </button>
      </div>
    </div>
  );
}
