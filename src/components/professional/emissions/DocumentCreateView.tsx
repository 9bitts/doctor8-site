"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Loader2, LayoutTemplate, Paperclip, Sparkles,
  ExternalLink, ChevronDown, ChevronUp, X,
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
import { uploadFileToApi } from "@/lib/upload-client";

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

interface ChartContextDoc {
  id: string;
  type: string;
  title: string;
  categoryName: string | null;
  hasFile: boolean;
  createdAt: string;
  sourceDocumentId?: string | null;
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
  initialCategoryId?: string | null;
  initialTemplateId?: string | null;
  editingDocumentId?: string | null;
  portal?: string;
  onBack: () => void;
  onSaved: (emission: SavedEmission) => void;
}

export function DocumentCreateView({
  t, charts, chartsLoading = false, reuseHint, templateHint, initialPatient, lockPatient = false, initialBody, initialType,
  initialCategoryId = null,
  initialTemplateId = null,
  editingDocumentId = null,
  portal: portalProp,
  onBack, onSaved,
}: DocumentCreateViewProps) {
  const { lang } = useI18n();
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id ?? "";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
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
    !!templateHint ||
    !!initialCategoryId;

  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [categoryId, setCategoryId] = useState(initialCategoryId || "");
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileKeys, setFileKeys] = useState<{ key: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [allergies, setAllergies] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<{ code: string; description: string | null }[]>([]);
  const [recentDocs, setRecentDocs] = useState<ChartContextDoc[]>([]);
  const [dossierDocIds, setDossierDocIds] = useState<string[]>([]);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    if (appliedBodySeedRef.current) return;
    if (!initialBody.trim()) return;
    appliedBodySeedRef.current = true;
    setBody(initialBody);
  }, [initialBody]);

  useEffect(() => {
    if (initialCategoryId) setCategoryId(initialCategoryId);
  }, [initialCategoryId]);

  // Restore draft — when seeded, still merge categoryId from draft if missing
  useEffect(() => {
    if (!userId || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const draft = loadDocumentDraft(userId, portal);
    if (!draft) return;

    if (hasSeedContent) {
      if (!categoryId && !initialCategoryId && draft.categoryId) {
        setCategoryId(draft.categoryId);
      }
      if (draft.editingDocumentId && editingDocumentId) {
        setEffectiveEditingId(editingDocumentId);
      }
      return;
    }

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
  }, [userId, portal, hasSeedContent, categoryId, initialCategoryId, editingDocumentId]);

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

  // Patient clinical context (E8) + exam list for dossier (E9)
  useEffect(() => {
    if (!selectedPatient?.id) {
      setAllergies(null);
      setDiagnoses([]);
      setRecentDocs([]);
      setDossierDocIds([]);
      return;
    }
    let active = true;
    setContextLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/professional/records/${selectedPatient.id}`);
        const data = await res.json();
        if (!active || !res.ok) return;
        setAllergies(typeof data.allergies === "string" ? data.allergies : null);
        setDiagnoses(Array.isArray(data.diagnoses) ? data.diagnoses : []);
        setRecentDocs(Array.isArray(data.documents) ? data.documents : []);
      } catch { /* ignore */ }
      finally {
        if (active) setContextLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedPatient?.id]);

  // Preserve catalog groupOrder/itemOrder (E10) — do not alphabetize
  const sortedCategories = useMemo(() => {
    return groups.flatMap((g) =>
      g.items.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        legacyType: c.legacyType,
        label: getCategoryLabel(lang, { slug: c.slug, name: c.name }),
      })),
    );
  }, [groups, lang]);

  useEffect(() => {
    if (categoryId || !sortedCategories.length) return;
    if (initialCategoryId) {
      const byId = sortedCategories.find((c) => c.id === initialCategoryId);
      if (byId) {
        setCategoryId(byId.id);
        return;
      }
    }
    const type = draftInitialType || initialType;
    if (!type) return;
    const byLegacy = sortedCategories.find((c) => c.legacyType === type);
    if (byLegacy) {
      setCategoryId(byLegacy.id);
      return;
    }
    // Relatório / laudo often have legacyType null — match slug/name
    const needle = type.toLowerCase();
    const bySlug = sortedCategories.find((c) =>
      c.slug.toLowerCase().includes(needle)
      || c.name.toLowerCase().includes(needle)
      || (needle.includes("report") && (c.slug.includes("relatorio") || c.slug.includes("report")))
      || (needle.includes("certificate") && (c.slug.includes("atestado") || c.slug.includes("certificate"))),
    );
    if (bySlug) setCategoryId(bySlug.id);
  }, [sortedCategories, initialType, draftInitialType, categoryId, initialCategoryId]);

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

      const match = sortedCategories.find((c) => c.legacyType === tpl.documentType)
        || sortedCategories.find((c) =>
          c.slug.toLowerCase().includes(tpl.documentType.toLowerCase())
          || c.name.toLowerCase().includes(tpl.documentType.toLowerCase()),
        );
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

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const f of Array.from(files)) {
        const up = await uploadFileToApi(f, "clinical-docs");
        if (!up.ok) {
          setError(
            up.error === "FILE_TOO_LARGE" ? t("docs.err.fileTooLarge") : t("rec.uploadFailed"),
          );
          break;
        }
        setFileKeys((prev) => [...prev, { key: up.key, name: up.name || f.name }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function analyzeAttachment(key: string, name: string) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/professional/ai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileKey: key, title: name, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "AI_NOT_CONFIGURED" ? t("rec.aiNotConfigured") : t("rec.aiError"),
        );
        return;
      }
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      if (summary) {
        setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${summary}` : summary));
      }
    } catch {
      setError(t("rec.aiError"));
    } finally {
      setAnalyzing(false);
    }
  }

  async function analyzeBodyText() {
    if (!body.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/professional/ai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text: body, title: t("rx.documentBody"), lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "AI_NOT_CONFIGURED" ? t("rec.aiNotConfigured") : t("rec.aiError"),
        );
        return;
      }
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      if (summary) {
        setBody((prev) => `${prev.trim()}\n\n---\n${summary}`);
      }
    } catch {
      setError(t("rec.aiError"));
    } finally {
      setAnalyzing(false);
    }
  }

  async function useDocInReport(docId: string) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/professional/ai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ documentId: docId, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "AI_NOT_CONFIGURED" ? t("rec.aiNotConfigured") : t("rec.aiError"),
        );
        return;
      }
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      if (summary) {
        setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${summary}` : summary));
      }
    } catch {
      setError(t("rec.aiError"));
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleDossierDoc(id: string) {
    setDossierDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

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
      const keys = fileKeys.map((f) => f.key);
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
              ? {
                  title,
                  content: body,
                  ...(categoryId ? { categoryId } : {}),
                  ...(keys.length ? { appendFileKeys: keys } : {}),
                }
              : {
                  patientRecordId: selectedPatient.id,
                  categoryId,
                  title,
                  content: body,
                  recordKind,
                  ...(keys.length === 1 ? { fileKey: keys[0] } : {}),
                  ...(keys.length > 0 ? { fileKeys: keys } : {}),
                },
          ),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const docId = effectiveEditingId || data.id;

        let dossierId: string | null = null;
        if (dossierDocIds.length > 0) {
          try {
            const dRes = await fetch("/api/professional/dossiers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                patientRecordId: selectedPatient.id,
                primaryDocumentId: docId,
                documentIds: dossierDocIds,
                title: title,
              }),
            });
            const dData = await dRes.json().catch(() => ({}));
            if (dRes.ok && dData.id) dossierId = dData.id;
          } catch { /* non-blocking */ }
        }

        if (userId) clearDocumentDraft(userId, portal);
        onSaved({
          kind: "document",
          id: docId,
          patient: selectedPatient,
          label: title,
          documentBody: body.trim(),
          dossierId: dossierId || undefined,
          dossierDocumentIds: dossierDocIds.length ? dossierDocIds : undefined,
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
    if (tpl.documentType === "EXAM_REQUEST") return false;
    if (!selectedCategory) return true;
    return tpl.documentType === selectedCategory.legacyType
      || (!selectedCategory.legacyType && (
        selectedCategory.slug.toLowerCase().includes(tpl.documentType.toLowerCase())
        || tpl.documentType === "OTHER"
      ));
  });

  const examCandidates = recentDocs.filter(
    (d) =>
      !d.sourceDocumentId
      && (d.type === "EXAM_RESULT" || d.type === "EXAM_REQUEST" || d.hasFile)
      && d.id !== effectiveEditingId,
  );

  const chartHref = selectedPatient
    ? (returnTo || `/${portal === "integrative-therapist" ? "integrative-therapist" : "professional"}/patients/${selectedPatient.id}`)
    : null;

  function handleBack() {
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    onBack();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 font-medium">
        <ArrowLeft size={16} /> {returnTo ? t("rx.backToChart") : t("rx.backToList")}
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

      {selectedPatient && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setContextOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-800">{t("rx.patientContext")}</span>
            {contextOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {contextOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {contextLoading ? (
                <p className="text-xs text-slate-400 inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {t("common.loading")}
                </p>
              ) : (
                <>
                  {allergies && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <span className="font-semibold">{t("rec.allergies")}: </span>{allergies}
                    </p>
                  )}
                  {diagnoses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">{t("rec.diagnoses")}</p>
                      <ul className="text-xs text-slate-600 space-y-0.5">
                        {diagnoses.map((d) => (
                          <li key={d.code}>{d.code}{d.description ? ` — ${d.description}` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recentDocs.slice(0, 6).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">{t("rx.recentDocuments")}</p>
                      <ul className="space-y-1">
                        {recentDocs.slice(0, 6).map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-700 truncate">{d.title}</span>
                            <button
                              type="button"
                              disabled={analyzing}
                              onClick={() => void useDocInReport(d.id)}
                              className="shrink-0 text-violet-600 hover:underline font-medium"
                            >
                              {t("rx.useInReport")}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {chartHref && (
                    <Link
                      href={chartHref}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      <ExternalLink size={12} /> {t("rx.openChart")}
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-600">{t("rx.documentBody")}</label>
            <button
              type="button"
              disabled={analyzing || !body.trim()}
              onClick={() => void analyzeBodyText()}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {t("rec.analyzeAI")}
            </button>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
            placeholder={t("rx.documentBodyPlaceholder")} className="rx-inp resize-y min-h-[200px]" />
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Paperclip size={14} /> {t("rx.attachExams")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 text-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
            {t("rec.attachFile")}
          </button>
          {fileKeys.length > 0 && (
            <ul className="space-y-1">
              {fileKeys.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span className="truncate text-slate-700">{f.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={() => void analyzeAttachment(f.key, f.name)}
                      className="text-violet-600 font-medium hover:underline"
                    >
                      {t("rec.analyzeAI")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileKeys((prev) => prev.filter((x) => x.key !== f.key))}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label={t("docs.delete")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {examCandidates.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-medium text-slate-600">{t("rx.dossierInclude")}</p>
            <p className="text-[11px] text-slate-400">{t("rx.dossierHint")}</p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {examCandidates.map((d) => (
                <li key={d.id}>
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={dossierDocIds.includes(d.id)}
                      onChange={() => toggleDossierDoc(d.id)}
                    />
                    <span>
                      <span className="font-medium">{d.title}</span>
                      {d.categoryName && (
                        <span className="text-slate-400"> · {d.categoryName}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={handleBack} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm">
            {t("rx2.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : (effectiveEditingId ? t("rec.saveChanges") : t("rx.generateDocument"))}
          </button>
        </div>
      </div>
    </div>
  );
}
