"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, FileText, Pill, Plus, Trash2, Loader2, Pencil, X, Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { TEMPLATE_TAG_HINTS } from "@/lib/template-tags";

const DOC_TYPES = [
  { value: "CERTIFICATE", labelKey: "rx.docTypeCertificate" },
  { value: "REFERRAL", labelKey: "rx.docTypeReferral" },
  { value: "CLINICAL_NOTE", labelKey: "rx.docTypeReport" },
  { value: "OTHER", labelKey: "rx.docTypeOther" },
] as const;

interface DocTemplate {
  id: string;
  name: string;
  documentType: string;
  title: string;
  body: string;
}

interface RxTemplate {
  id: string;
  name: string;
  medications: { name: string; dosage: string; frequency: string }[];
  instructions: string;
  validDays: number;
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export default function TemplatesSettingsClient() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [error, setError] = useState("");

  const [showDocForm, setShowDocForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("CERTIFICATE");
  const [docTitle, setDocTitle] = useState("");
  const [docBody, setDocBody] = useState("");
  const [docSaving, setDocSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [docRes, rxRes] = await Promise.all([
        fetch("/api/professional/templates/documents"),
        fetch("/api/professional/templates/prescriptions"),
      ]);
      const docData = await docRes.json();
      const rxData = await rxRes.json();
      if (!docRes.ok) throw new Error(docData.error || t("tmpl.loadError"));
      if (!rxRes.ok) throw new Error(rxData.error || t("tmpl.loadError"));
      setDocTemplates(docData.templates || []);
      setRxTemplates(rxData.templates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tmpl.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function resetDocForm() {
    setShowDocForm(false);
    setEditingDocId(null);
    setDocName("");
    setDocType("CERTIFICATE");
    setDocTitle("");
    setDocBody("");
  }

  function openEditDoc(tpl: DocTemplate) {
    setEditingDocId(tpl.id);
    setDocName(tpl.name);
    setDocType(tpl.documentType);
    setDocTitle(tpl.title);
    setDocBody(tpl.body);
    setShowDocForm(true);
  }

  async function saveDocTemplate() {
    if (!docName.trim() || !docTitle.trim() || !docBody.trim()) {
      setError(t("tmpl.fillRequired"));
      return;
    }
    setDocSaving(true);
    setError("");
    try {
      const payload = {
        name: docName.trim(),
        documentType: docType,
        title: docTitle,
        body: docBody,
      };
      const res = editingDocId
        ? await fetch(`/api/professional/templates/documents/${editingDocId}`, {
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
      resetDocForm();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tmpl.saveError"));
    } finally {
      setDocSaving(false);
    }
  }

  async function deleteDocTemplate(id: string) {
    if (!confirm(t("tmpl.confirmDelete"))) return;
    const res = await fetch(`/api/professional/templates/documents/${id}`, { method: "DELETE" });
    if (res.ok) setDocTemplates((prev) => prev.filter((x) => x.id !== id));
  }

  async function deleteRxTemplate(id: string) {
    if (!confirm(t("tmpl.confirmDelete"))) return;
    const res = await fetch(`/api/professional/templates/prescriptions/${id}`, { method: "DELETE" });
    if (res.ok) setRxTemplates((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <Link
        href="/professional/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> {t("tmpl.backToSettings")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("tmpl.title")}</h1>
        <p className="text-slate-500 mt-1">{t("tmpl.subtitle")}</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">{error}</div>
      )}

      {/* Document templates */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-brand-500" /> {t("tmpl.docSection")}
          </h2>
          {!showDocForm && (
            <button
              type="button"
              onClick={() => { resetDocForm(); setShowDocForm(true); }}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1"
            >
              <Plus size={16} /> {t("tmpl.newDocTemplate")}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {t("tmpl.tagsHint")}{" "}
          {TEMPLATE_TAG_HINTS.map((tag) => (
            <code key={tag} className="bg-slate-100 px-1 rounded mx-0.5">{tag}</code>
          ))}
        </p>

        {showDocForm && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("tmpl.templateName")}</label>
              <input className={inputClass} value={docName} onChange={(e) => setDocName(e.target.value)}
                placeholder={t("tmpl.docNamePlaceholder")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentType")}</label>
              <select className={inputClass + " bg-white"} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{t(dt.labelKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentTitleLabel")}</label>
              <input className={inputClass} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentBody")}</label>
              <textarea className={inputClass + " resize-y min-h-[160px]"} value={docBody}
                onChange={(e) => setDocBody(e.target.value)} rows={8} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetDocForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 flex items-center gap-1">
                <X size={14} /> {t("common.cancel")}
              </button>
              <button type="button" onClick={saveDocTemplate} disabled={docSaving}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
                {docSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingDocId ? t("tmpl.saveChanges") : t("tmpl.createTemplate")}
              </button>
            </div>
          </div>
        )}

        {docTemplates.length === 0 && !showDocForm ? (
          <p className="text-sm text-slate-400">{t("tmpl.noDocTemplates")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docTemplates.map((tpl) => (
              <li key={tpl.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{tpl.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.title}</p>
                </div>
                <button type="button" onClick={() => openEditDoc(tpl)}
                  className="p-2 text-slate-400 hover:text-brand-500 rounded-lg" title={t("tmpl.edit")}>
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => deleteDocTemplate(tpl.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title={t("tmpl.delete")}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Prescription templates */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Pill size={18} className="text-brand-500" /> {t("tmpl.rxSection")}
        </h2>
        <p className="text-sm text-slate-500">{t("tmpl.rxSectionHint")}</p>

        {rxTemplates.length === 0 ? (
          <p className="text-sm text-slate-400">{t("tmpl.noRxTemplates")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rxTemplates.map((tpl) => (
              <li key={tpl.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{tpl.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(tpl.medications as { name: string }[]).map((m) => m.name).join(" ? ")}
                  </p>
                </div>
                <button type="button" onClick={() => deleteRxTemplate(tpl.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title={t("tmpl.delete")}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
