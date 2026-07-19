"use client";

import { useState } from "react";
import { Trash2, Loader2, Check, X } from "lucide-react";
import ExamSearchInput, { formatExamItem } from "@/components/ExamSearchInput";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";
import {
  parseExamTemplateBody,
  stringifyExamTemplateBody,
  type TemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/clinical-template-utils";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export interface ExamTemplateData {
  id: string;
  name: string;
  title: string;
  body: string;
  templateCategory: string | null;
}

interface ExamTemplateFormProps {
  category: typeof TEMPLATE_CATEGORIES.EXAM_CLINICAL | typeof TEMPLATE_CATEGORIES.EXAM_PREOP;
  defaultTitle: string;
  editing?: ExamTemplateData | null;
  t: (k: string) => string;
  onSaved: () => void;
  onCancel: () => void;
}

export function ExamTemplateForm({
  category,
  defaultTitle,
  editing,
  t,
  onSaved,
  onCancel,
}: ExamTemplateFormProps) {
  const initial = editing ? parseExamTemplateBody(editing.body) : null;
  const [name, setName] = useState(editing?.name || "");
  const [title, setTitle] = useState(editing?.title || defaultTitle);
  const [items, setItems] = useState<string[]>(initial?.items || []);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [cid, setCid] = useState<CidSelection | null>(
    initial?.cid ? { code: initial.cid, description: initial.cidLabel || "" } : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [examSearchOpen, setExamSearchOpen] = useState(false);
  const [cidSearchOpen, setCidSearchOpen] = useState(false);

  function addExam(exam: { code?: string; name: string }) {
    const line = formatExamItem(exam);
    if (!line.trim()) return;
    setItems((prev) => [...prev, line]);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(t("tmpl.fillName"));
      return;
    }
    const cleanItems = items.map((i) => i.trim()).filter(Boolean);
    if (cleanItems.length === 0) {
      setError(t("tmpl.fillExams"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        documentType: "EXAM_REQUEST" as const,
        templateCategory: category as TemplateCategory,
        title: title.trim() || defaultTitle,
        body: stringifyExamTemplateBody({
          items: cleanItems,
          notes: notes.trim(),
          cid: cid?.code || "",
          cidLabel: cid?.description || "",
        }),
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
          placeholder={t("tmpl.examNamePlaceholder")} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.documentTitleLabel")}</label>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className={examSearchOpen ? "relative z-30 space-y-2" : "space-y-2"}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.examItems")}</label>
        <ExamSearchInput
          placeholder={t("rx.searchExam")}
          manualLabel={t("rx.addExamManual")}
          manualHint={t("rx.manualExamHint")}
          emptyManualWarning={t("rx.emptyManualWarning")}
          onAdd={addExam}
          onOpenChange={setExamSearchOpen}
        />
        {items.length > 0 && (
          <ul className={`mt-3 space-y-2 ${examSearchOpen ? "relative z-0" : ""}`}>
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-3 py-2">
                <input
                  className="flex-1 text-sm border-0 bg-transparent focus:outline-none"
                  value={item}
                  onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                  className="p-1 text-slate-400 hover:text-rose-500">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cidSearchOpen ? "relative z-20" : ""}>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.cidLabel")}</label>
        <CidSearchInput
          value={cid}
          onChange={setCid}
          onOpenChange={setCidSearchOpen}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.examNotes")}</label>
        <textarea className={inputClass + " resize-y min-h-[80px]"} value={notes}
          onChange={(e) => setNotes(e.target.value)} rows={3} />
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
