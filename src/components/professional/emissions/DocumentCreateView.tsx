"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, FileText, Loader2, LayoutTemplate,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { Chart } from "./types";
import type { SavedEmission } from "./EmissionPostSaveFlow";
import { PatientSearchCombobox } from "@/components/professional/PatientSearchCombobox";
import CategorySearchSelect from "@/components/professional/CategorySearchSelect";
import { getCategoryLabel } from "@/lib/category-i18n";
import { inferRecordKindFromCategory } from "@/lib/record-kind";
import {
  clearDocumentDraft,
  loadDocumentDraft,
  saveDocumentDraft,
  type DocumentFormDraft,
} from "@/lib/emission-form-draft";
import {
  extendSessionForWrite,
  isAuthFailureStatus,
  redirectToLoginAfterAuthFailure,
} from "@/lib/session-extend-client";

interface CategoryGroup {
  group: string;
  items: {
    id: string;
    name: string;
    slug: string;
    legacyType: string | null;
  }[];
}

interface DocTemplate {
  id: string;
  name: string;
  documentType: string;
  title: string;
  body: string;
}

interface DocumentCreateViewProps {
  t: (k: string) => string;
  charts: Chart[];
  chartsLoading?: boolean;
  reuseHint?: boolean;
  templateHint?: boolean;
  initialPatient: Chart | null;
  lockPatient?: boolean;
  initialBody: string;
  initialType: string;
  initialTemplateId?: string | null;
  editingDocumentId?: string | null;
  portal?: string;
  onBack: () => void;
  onSaved: (emission: SavedEmission) => void;
}

export function DocumentCreateView({
  t, charts, chartsLoading = false, reuseHint, templateHint, initialPatient, lockPatient = false, initialBody, initialType,
  initialTemplateId = null,
  editingDocumentId = null,
  portal: portalProp,
  onBack, onSaved,
}: DocumentCreateViewProps) {
  const { lang } = useI18n();
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id ?? "";
  const pathname = usePathname();
  const portal =
    portalProp ||
    (pathname.startsWith("/integrative-therapist")
      ? "integrative-therapist"
      : "professional");
  const locale = localeOf(lang);

  const hasSeedContent =
    !!initialPatient ||
    !!initialBody.trim() ||
    !!editingDocumentId ||
    !!initialTemplateId ||
    !!reuseHint ||
    !!templateHint;

  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [categoryId, setCategoryId] = useState("");
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftRestoredHint, setDraftRestoredHint] = useState(false);
  const [effectiveLockPatient, setEffectiveLockPatient] = useState(lockPatient);
  const [effectiveEditingId, setEffectiveEditingId] = useState(editingDocumentId);
  const [draftInitialType, setDraftInitialType] = useState(initialType);

  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const lastTemplateId = useRef<string | null>(null);
  const draftHydratedRef = useRef(false);
  const suppressDraftSaveRef = useRef(false);
  const skipInitialTemplateRef = useRef(false);
  const appliedBodySeedRef = useRef(!!initialBody.trim());

  // Prefill from "Utilizar modelo" can arrive after first mount.
  useEffect(() => {
    if (appliedBodySeedRef.current) return;
    if (!initialBody.trim()) return;
    appliedBodySeedRef.current = true;
    setBody(initialBody);
  }, [initialBody]);

  useEffect(() => {
    if (!userId || draftHydratedRef.current || hasSeedContent) {
      draftHydratedRef.current = true;
      return;
    }
    draftHydratedRef.current = true;
    const draft = loadDocumentDraft(userId, portal);
    if (!draft) return;

    suppressDraftSaveRef.current = true;
    skipInitialTemplateRef.current = true;
    if (draft.selectedPatient) {
      setSelectedPatient({
        id: draft.selectedPatient.id,
        firstName: draft.selectedPatient.firstName,
        lastName: draft.selectedPatient.lastName,
        email: draft.selectedPatient.email,
        hasAccount: draft.selectedPatient.hasAccount,
      });
    }
    if (draft.categoryId) setCategoryId(draft.categoryId);
    if (draft.body) setBody(draft.body);
    if (draft.initialType) setDraftInitialType(draft.initialType);
    setEffectiveEditingId(draft.editingDocumentId);
    setEffectiveLockPatient(!!draft.lockPatient);
    setDraftRestoredHint(true);
    queueMicrotask(() => {
      suppressDraftSaveRef.current = false;
    });
  }, [userId, portal, hasSeedContent]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (active) setGroups(data.groups || []);
      } catch { /* ignore */ }
      if (active) setCategoriesLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/professional/templates/documents");
        const data = await res.json();
        if (active) setTemplates(data.templates || []);
      } catch { /* ignore */ }
      if (active) setTemplatesLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const sortedCategories = useMemo(() => {
    const sortLocale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
    const items = groups.flatMap((g) =>
      g.items.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        legacyType: c.legacyType,
        label: getCategoryLabel(lang, { slug: c.slug, name: c.name }),
      })),
    );
    items.sort((a, b) => a.label.localeCompare(b.label, sortLocale, { sensitivity: "base" }));
    return items;
  }, [groups, lang]);

  useEffect(() => {
    if (categoryId || !sortedCategories.length) return;
    const type = draftInitialType || initialType;
    if (type) {
      const match = sortedCategories.find((c) => c.legacyType === type);
      if (match) setCategoryId(match.id);
    }
  }, [sortedCategories, initialType, draftInitialType, categoryId]);

  useEffect(() => {
    if (!userId || suppressDraftSaveRef.current) return;
    const draft: DocumentFormDraft = {
      selectedPatient: selectedPatient
        ? {
            id: selectedPatient.id,
            firstName: selectedPatient.firstName,
            lastName: selectedPatient.lastName,
            email: selectedPatient.email,
            hasAccount: selectedPatient.hasAccount,
          }
        : null,
      categoryId,
      body,
      initialType: draftInitialType || initialType || "",
      editingDocumentId: effectiveEditingId,
      lockPatient: effectiveLockPatient,
    };
    const timer = window.setTimeout(() => {
      saveDocumentDraft(userId, portal, draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    userId,
    portal,
    selectedPatient,
    categoryId,
    body,
    draftInitialType,
    initialType,
    effectiveEditingId,
    effectiveLockPatient,
  ]);

  async function applyTemplate(tpl: DocTemplate) {
    lastTemplateId.current = tpl.id;
    setApplyingTemplate(true);
    setError("");
    try {
      const params = new URLSearchParams({
        previewId: tpl.id,
        locale: locale,
      });
      if (selectedPatient?.id) params.set("patientRecordId", selectedPatient.id);

      const res = await fetch(`/api/professional/templates/documents?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tmpl.applyError"));

      const match = sortedCategories.find((c) => c.legacyType === tpl.documentType);
      if (match) setCategoryId(match.id);
      setBody(data.preview?.body || tpl.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tmpl.applyError"));
    } finally {
      setApplyingTemplate(false);
    }
  }

  useEffect(() => {
    if (!initialTemplateId || skipInitialTemplateRef.current) return;
    lastTemplateId.current = initialTemplateId;
  }, [initialTemplateId]);

  useEffect(() => {
    if (!initialTemplateId || !templates.length || skipInitialTemplateRef.current) return;
    const tpl = templates.find((x) => x.id === initialTemplateId);
    if (tpl) void applyTemplate(tpl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId, templates.length]);

  useEffect(() => {
    if (!selectedPatient?.id || !lastTemplateId.current) return;
    if (skipInitialTemplateRef.current && draftRestoredHint) return;
    const tpl = templates.find((x) => x.id === lastTemplateId.current);
    if (tpl) void applyTemplate(tpl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id]);

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("rx2.needPatient")); return; }
    if (!categoryId) { setError(t("rec.errCategory")); return; }
    if (!body.trim()) { setError(t("rx.needDocumentBody")); return; }

    const cat = sortedCategories.find((c) => c.id === categoryId);
    if (!cat) { setError(t("rec.errCategory")); return; }

    const title = cat.label;
    const recordKind = inferRecordKindFromCategory(
      { slug: cat.slug, name: cat.name, legacyType: cat.legacyType },
      [],
    );

    setSaving(true);
    try {
      await extendSessionForWrite(updateSession);
      const res = await fetch(
        effectiveEditingId
          ? `/api/professional/documents/${effectiveEditingId}`
          : "/api/professional/documents",
        {
          method: effectiveEditingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(
            effectiveEditingId
              ? { title, content: body, ...(categoryId ? { categoryId } : {}) }
              : {
                  patientRecordId: selectedPatient.id,
                  categoryId,
                  title,
                  content: body,
                  recordKind,
                },
          ),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (userId) clearDocumentDraft(userId, portal);
        onSaved({
          kind: "document",
          id: effectiveEditingId || data.id,
          patient: selectedPatient,
          label: title,
          documentBody: body.trim(),
        });
      } else if (isAuthFailureStatus(res.status)) {
        setError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("rx.saveError"));
      }
    } finally { setSaving(false); }
  }

  const selectedCategory = sortedCategories.find((c) => c.id === categoryId) ?? null;
  const filteredTemplates = templates.filter((tpl) => {
    // Exam request templates use a structured JSON body — never offer them in the document form.
    if (tpl.documentType === "EXAM_REQUEST") return false;
    if (!selectedCategory) return true;
    return tpl.documentType === selectedCategory.legacyType;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 font-medium">
        <ArrowLeft size={16} /> {t("rx.backToList")}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("rx.documentFormTitle")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("rx.documentFormSubtitle")}</p>
      </div>

      {draftRestoredHint && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-800">
          {t("rx.draftRestored")}
        </div>
      )}

      {(templateHint || reuseHint) && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
          {templateHint ? t("tmpl.templateAppliedHint") : t("rx.reuseHint")}
        </div>
      )}

      <PatientSearchCombobox
        t={t}
        ownCharts={charts}
        chartsLoading={chartsLoading}
        selectedPatient={selectedPatient}
        onSelectPatient={setSelectedPatient}
        lockPatient={effectiveLockPatient}
      />

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
        {categoriesLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 size={14} className="animate-spin" /> {t("docs.modal.loadingCategories")}
          </div>
        ) : sortedCategories.length === 0 ? (
          <p className="text-sm text-amber-600">{t("docs.modal.noCategories")}</p>
        ) : (
          <CategorySearchSelect
            label={t("docs.modal.category")}
            options={sortedCategories.map((c) => ({ id: c.id, label: c.label }))}
            value={categoryId}
            onChange={setCategoryId}
          />
        )}

        {!templatesLoading && templates.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <LayoutTemplate size={14} /> {t("tmpl.useTemplate")}
            </p>
            <div className="flex flex-wrap gap-2">
              {filteredTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={applyingTemplate}
                  onClick={() => applyTemplate(tpl)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 text-slate-700 disabled:opacity-50"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            {!selectedPatient && (
              <p className="text-xs text-amber-600 mt-2">{t("tmpl.selectPatientForTags")}</p>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.documentBody")}</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
            placeholder={t("rx.documentBodyPlaceholder")} className="rx-inp resize-y min-h-[200px]" />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={onBack} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm">
            {t("rx2.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : t("rx.generateDocument")}
          </button>
        </div>
      </div>
    </div>
  );
}
