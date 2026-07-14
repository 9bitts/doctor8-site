"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  type NaturalMedicinePortal,
  type NaturalMedicinePracticeConfig,
  naturalMedicineBackToHubKey,
} from "@/lib/natural-medicine/config";
import {
  MN_PRACTICE_THEME,
  searchModeForPractice,
  templateMatchesPractice,
} from "@/lib/medicina-natural-catalog/mn-template-utils";
import { mnStartersForPractice } from "@/lib/medicina-natural-catalog/mn-starter-templates";
import { PRACTICE_RX_ADD_PARAM } from "@/lib/medicina-natural-catalog/practice-prescriptions";
import {
  FLORAL_STARTER_TEMPLATES,
  templateHasFloralItems,
} from "@/lib/pics/reference-library/floral-starter-templates";
import { floralProductByValue } from "@/lib/pics/reference-library/floral-products";
import { RxTemplateForm, type RxTemplateData } from "@/components/professional/settings/templates/RxTemplateForm";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";

interface SavedRxTemplate {
  id: string;
  name: string;
  medications: {
    name: string;
    itemKind?: string;
    floralProductId?: string;
    mnSlug?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    presentation?: string;
    pharmaceuticalForm?: string;
    controlled?: boolean;
    prescriptionType?: string | null;
    renisus?: boolean;
  }[];
  instructions: string;
  validDays: number;
}

function toRxTemplateData(tpl: SavedRxTemplate): RxTemplateData {
  return {
    id: tpl.id,
    name: tpl.name,
    instructions: tpl.instructions,
    validDays: tpl.validDays,
    medications: tpl.medications.map(
      (m): PrescriptionMedItem => ({
        name: m.name,
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration || "",
        instructions: m.instructions || "",
        presentation: m.presentation,
        pharmaceuticalForm: m.pharmaceuticalForm,
        controlled: m.controlled,
        prescriptionType: m.prescriptionType,
        itemKind: m.itemKind as PrescriptionMedItem["itemKind"],
        mnSlug: m.mnSlug,
        renisus: m.renisus,
        floralProductId: m.floralProductId,
      }),
    ),
  };
}

interface MnPrescriptionTemplatesProps {
  portal: NaturalMedicinePortal;
  practice: NaturalMedicinePracticeConfig;
  backHref: string;
}

export default function MnPrescriptionTemplates({
  portal,
  practice,
  backHref,
}: MnPrescriptionTemplatesProps) {
  const { t } = useI18n();
  const router = useRouter();
  const theme = MN_PRACTICE_THEME[practice.id];
  const apiBase =
    portal === "professional" ? "/api/professional" : "/api/integrative-therapist";
  const prescriptionsBase =
    portal === "professional" ? "/professional/prescriptions" : "/integrative-therapist/prescriptions";
  const addParam = PRACTICE_RX_ADD_PARAM[practice.id];

  const [saved, setSaved] = useState<SavedRxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | RxTemplateData | null>(null);

  const isFloral = practice.id === "terapia_florais";
  const catalogStarters = mnStartersForPractice(practice.id);
  const practiceSearchMode = searchModeForPractice(practice.id);

  async function reloadSaved() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/templates/prescriptions`);
      const data = await res.json();
      if (res.ok) {
        const all = (data.templates || []) as SavedRxTemplate[];
        setSaved(
          all.filter((tpl) =>
            isFloral
              ? templateHasFloralItems(tpl.medications)
              : templateMatchesPractice(tpl.medications, practice.id),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const reloadSavedStable = useCallback(reloadSaved, [apiBase, isFloral, practice.id]);

  useEffect(() => {
    reloadSavedStable();
  }, [reloadSavedStable]);

  function openPrescription(query: string) {
    const q = query ? `&${query}` : "";
    router.push(`${prescriptionsBase}?add=${addParam}${q}`);
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm(t("nm.mod.mnTemplates.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${apiBase}/templates/prescriptions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setSaved((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (editor) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => setEditor(null)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition"
        >
          <ArrowLeft size={16} />
          {t("nm.mod.mnTemplates.backToList")}
        </button>
        <RxTemplateForm
          editing={editor === "create" ? null : editor}
          t={t}
          apiBase={apiBase}
          practiceSearchMode={practiceSearchMode}
          showMedicationTab={false}
          includeTemplateCategory={portal === "professional"}
          onSaved={async () => {
            setEditor(null);
            await reloadSavedStable();
          }}
          onCancel={() => setEditor(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft size={16} />
        {t(naturalMedicineBackToHubKey(portal))}
      </Link>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${practice.color}`}>
          <LayoutTemplate size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t(`nm.mod.mnTemplates.title.${practice.id}`)}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("nm.mod.mnTemplates.subtitle")}</p>
        </div>
      </div>

      <div className={`border rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${theme.card}`}>
        <p className="text-xs leading-relaxed flex-1">{t("nm.mod.mnTemplates.hint")}</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditor("create")}
            className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white px-4 py-2.5 rounded-xl ${theme.button}`}
          >
            <Plus size={14} />
            {t("nm.mod.mnTemplates.createTemplate")}
          </button>
          <button
            type="button"
            onClick={() => openPrescription("")}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ArrowRight size={14} />
            {t(
              practice.id === "terapia_florais"
                ? "nm.mod.floralPrescriptions.title"
                : "nm.mod.prescriptions.title",
            )}
          </button>
        </div>
      </div>

      {(isFloral ? FLORAL_STARTER_TEMPLATES.length > 0 : catalogStarters.length > 0) && (
        <section>
          <h2 className={`text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2`}>
            <LayoutTemplate size={16} className={theme.icon} />
            {t("nm.mod.mnTemplates.startersTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {isFloral
              ? FLORAL_STARTER_TEMPLATES.map((starter) => {
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
                      className={`text-left bg-white rounded-2xl border border-slate-200 p-4 ${theme.border} hover:shadow-sm transition group`}
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700 text-sm">
                        {t(starter.nameKey)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preview}</p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold mt-2 ${theme.icon}`}>
                        {t("nm.mod.mnTemplates.useStarter")}
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  );
                })
              : catalogStarters.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    onClick={() => openPrescription(`mnSlug=${encodeURIComponent(starter.mnSlug)}`)}
                    className={`text-left bg-white rounded-2xl border border-slate-200 p-4 ${theme.border} hover:shadow-sm transition group`}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{t(starter.nameKey)}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t(starter.previewKey)}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold mt-2 ${theme.icon}`}>
                      {t("nm.mod.mnTemplates.useStarter")}
                      <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <BookmarkPlus size={16} className={theme.icon} />
          {t("nm.mod.mnTemplates.savedTitle")}
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className={`animate-spin ${theme.icon}`} />
          </div>
        ) : saved.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm text-slate-500">{t("nm.mod.mnTemplates.empty")}</p>
            <p className="text-xs text-slate-400">{t("nm.mod.mnTemplates.emptyHint")}</p>
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
                    {tpl.medications.length} {t("nm.mod.mnTemplates.items")} · {tpl.validDays}{" "}
                    {t("nm.mod.mnTemplates.days")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setEditor(toRxTemplateData(tpl))}
                  className="text-slate-400 hover:text-emerald-600 p-2 shrink-0"
                  aria-label={t("nm.mod.mnTemplates.editTemplate")}
                >
                  <Pencil size={16} />
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
