"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Flower2,
  LayoutTemplate,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { NaturalMedicinePracticeConfig } from "@/lib/natural-medicine/config";
import {
  FLORAL_STARTER_TEMPLATES,
  templateHasFloralItems,
} from "@/lib/pics/reference-library/floral-starter-templates";
import { floralProductByValue } from "@/lib/pics/reference-library/floral-products";

interface SavedRxTemplate {
  id: string;
  name: string;
  medications: {
    name: string;
    itemKind?: string;
    floralProductId?: string;
    dosage?: string;
  }[];
  instructions: string;
  validDays: number;
}

interface FloralPrescriptionTemplatesProps {
  practice: NaturalMedicinePracticeConfig;
  backHref: string;
}

export default function FloralPrescriptionTemplates({
  practice,
  backHref,
}: FloralPrescriptionTemplatesProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrative-therapist/templates/prescriptions");
        const data = await res.json();
        if (res.ok) {
          const all = (data.templates || []) as SavedRxTemplate[];
          setSaved(all.filter((tpl) => templateHasFloralItems(tpl.medications)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openPrescription(query: string) {
    router.push(`/integrative-therapist/prescriptions?add=floral&${query}`);
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm(t("tmpl.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/integrative-therapist/templates/prescriptions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setSaved((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-pink-700 transition"
      >
        <ArrowLeft size={16} />
        {t("nm.practice.backToHub")}
      </Link>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${practice.color}`}>
          <LayoutTemplate size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("nm.mod.floralTemplates.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("nm.mod.floralTemplates.subtitle")}</p>
        </div>
      </div>

      <div className="bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs text-pink-900 leading-relaxed flex-1">{t("nm.mod.floralTemplates.hint")}</p>
        <button
          type="button"
          onClick={() => openPrescription("")}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl"
        >
          <Plus size={14} />
          {t("nm.mod.floralPrescriptions.title")}
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Flower2 size={16} className="text-pink-500" />
          {t("nm.mod.floralTemplates.startersTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FLORAL_STARTER_TEMPLATES.map((starter) => {
            const preview = starter.medications
              .map((m) => {
                const p = floralProductByValue(m.floralProductId);
                return p ? t(p.labelKey) : m.floralProductId;
              })
              .join(" + ");
            return (
              <button
                key={starter.id}
                type="button"
                onClick={() => openPrescription(`starter=${starter.id}`)}
                className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-pink-200 hover:shadow-sm transition group"
              >
                <p className="font-semibold text-slate-900 group-hover:text-pink-700 text-sm">
                  {t(starter.nameKey)}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preview}</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 mt-2">
                  {t("nm.mod.floralTemplates.useStarter")}
                  <ArrowRight size={12} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <BookmarkPlus size={16} className="text-pink-500" />
          {t("nm.mod.floralTemplates.savedTitle")}
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-pink-400" />
          </div>
        ) : saved.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm text-slate-500">{t("nm.mod.floralTemplates.empty")}</p>
            <p className="text-xs text-slate-400">{t("nm.mod.floralTemplates.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {saved.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => openPrescription(`templateId=${tpl.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-medium text-slate-800 text-sm truncate">{tpl.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tpl.medications.length} {t("nm.mod.floralTemplates.items")} · {tpl.validDays} {t("nm.mod.floralTemplates.days")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(tpl.id)}
                  disabled={deletingId === tpl.id}
                  className="text-slate-400 hover:text-rose-600 p-2 shrink-0 disabled:opacity-50"
                  aria-label={t("tmpl.delete")}
                >
                  {deletingId === tpl.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
