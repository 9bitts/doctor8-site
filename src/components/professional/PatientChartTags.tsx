"use client";

import { useState, useEffect } from "react";
import { Plus, X, Loader2, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type ChartTag = {
  id: string;
  kind: "ALLERGY" | "MEDICATION" | "PREGNANT" | "OTHER";
  label: string;
};

const KIND_OPTIONS = [
  { value: "ALLERGY", labelKey: "tag.kind.allergy", className: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "MEDICATION", labelKey: "tag.kind.medication", className: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "PREGNANT", labelKey: "tag.kind.pregnant", className: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "OTHER", labelKey: "tag.kind.other", className: "bg-amber-50 text-amber-800 border-amber-200" },
] as const;

function kindStyle(kind: ChartTag["kind"]) {
  return KIND_OPTIONS.find((k) => k.value === kind)?.className
    || "bg-slate-50 text-slate-700 border-slate-200";
}

export default function PatientChartTags({
  chartId,
  initialTags = [],
}: {
  chartId: string;
  initialTags?: ChartTag[];
}) {
  const { t } = useI18n();
  const [tags, setTags] = useState<ChartTag[]>(initialTags);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ChartTag["kind"]>("ALLERGY");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  async function addTag() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, label: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tag.saveError"));
      setTags((prev) => [...prev, data]);
      setLabel("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tag.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(tagId: string) {
    const res = await fetch(`/api/professional/records/${chartId}/tags/${tagId}`, {
      method: "DELETE",
    });
    if (res.ok) setTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <Tag size={12} /> {t("tag.sectionTitle")}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1"
          >
            <Plus size={12} /> {t("tag.add")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${kindStyle(tag.kind)}`}
          >
            {tag.label}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="opacity-60 hover:opacity-100"
              aria-label={t("tag.remove")}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && !adding && (
          <span className="text-xs text-slate-400">{t("tag.empty")}</span>
        )}
      </div>

      {adding && (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                  kind === opt.value ? opt.className + " ring-2 ring-brand-300" : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("tag.labelPlaceholder")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAdding(false); setLabel(""); setError(""); }}
              className="text-xs text-slate-500 px-3 py-1.5">{t("common.cancel")}</button>
            <button type="button" onClick={addTag} disabled={saving || !label.trim()}
              className="text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 size={12} className="animate-spin" />}
              {t("tag.save")}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
    </div>
  );
}

export function tagKindLabel(t: (k: string) => string, kind: ChartTag["kind"]): string {
  const opt = KIND_OPTIONS.find((k) => k.value === kind);
  return opt ? t(opt.labelKey) : kind;
}
