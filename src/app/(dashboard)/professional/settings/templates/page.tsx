"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, FlaskConical, Pill, FileText, Plus, Loader2, ClipboardList,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  TEMPLATE_CATEGORIES,
  parseExamTemplateBody,
} from "@/lib/clinical-template-utils";
import { ExamTemplateForm, type ExamTemplateData } from "@/components/professional/settings/templates/ExamTemplateForm";
import { RxTemplateForm, type RxTemplateData } from "@/components/professional/settings/templates/RxTemplateForm";
import { CertificateTemplateForm, type CertificateTemplateData } from "@/components/professional/settings/templates/CertificateTemplateForm";
import { TemplateSectionList } from "@/components/professional/settings/templates/TemplateSectionList";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";

type FormKind = "exam_clinical" | "exam_preop" | "rx_postop" | "certificate" | null;

interface DocTemplateRow {
  id: string;
  name: string;
  documentType: string;
  templateCategory: string | null;
  title: string;
  body: string;
}

interface RxTemplateRow {
  id: string;
  name: string;
  templateCategory: string | null;
  medications: PrescriptionMedItem[];
  instructions: string;
  validDays: number;
}

export default function TemplatesSettingsClient() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [docTemplates, setDocTemplates] = useState<DocTemplateRow[]>([]);
  const [rxTemplates, setRxTemplates] = useState<RxTemplateRow[]>([]);
  const [error, setError] = useState("");
  const [activeForm, setActiveForm] = useState<FormKind>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const examClinical = useMemo(
    () => docTemplates.filter((x) => x.templateCategory === TEMPLATE_CATEGORIES.EXAM_CLINICAL),
    [docTemplates],
  );
  const examPreop = useMemo(
    () => docTemplates.filter((x) => x.templateCategory === TEMPLATE_CATEGORIES.EXAM_PREOP),
    [docTemplates],
  );
  const certificates = useMemo(
    () => docTemplates.filter((x) => x.templateCategory === TEMPLATE_CATEGORIES.CERTIFICATE),
    [docTemplates],
  );
  const rxPostop = useMemo(
    () => rxTemplates.filter((x) => x.templateCategory === TEMPLATE_CATEGORIES.RX_POSTOP),
    [rxTemplates],
  );

  function openCreate(kind: FormKind) {
    setEditingId(null);
    setActiveForm(kind);
  }

  function openEdit(kind: FormKind, id: string) {
    setEditingId(id);
    setActiveForm(kind);
  }

  function closeForm() {
    setActiveForm(null);
    setEditingId(null);
  }

  async function handleSaved() {
    closeForm();
    await loadAll();
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

  const editingExamClinical = editingId
    ? examClinical.find((x) => x.id === editingId) as ExamTemplateData | undefined
    : undefined;
  const editingExamPreop = editingId
    ? examPreop.find((x) => x.id === editingId) as ExamTemplateData | undefined
    : undefined;
  const editingCertificate = editingId
    ? certificates.find((x) => x.id === editingId) as CertificateTemplateData | undefined
    : undefined;
  const editingRxPostop = editingId
    ? rxPostop.find((x) => x.id === editingId) as RxTemplateData | undefined
    : undefined;

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

      {/* Solicitação de exames clínicos */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FlaskConical size={18} className="text-brand-500" /> {t("tmpl.examClinicalSection")}
          </h2>
          {activeForm !== "exam_clinical" && (
            <button type="button" onClick={() => openCreate("exam_clinical")}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <Plus size={16} /> {t("tmpl.newDocTemplate")}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{t("tmpl.examClinicalHint")}</p>
        {activeForm === "exam_clinical" && (
          <ExamTemplateForm
            category={TEMPLATE_CATEGORIES.EXAM_CLINICAL}
            defaultTitle={t("tmpl.examClinicalDefaultTitle")}
            editing={editingExamClinical}
            t={t}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}
        <TemplateSectionList
          items={examClinical.map((tpl) => {
            const parsed = parseExamTemplateBody(tpl.body);
            return {
              id: tpl.id,
              name: tpl.name,
              subtitle: parsed.items.slice(0, 3).join(" · ") + (parsed.items.length > 3 ? "…" : ""),
            };
          })}
          category={TEMPLATE_CATEGORIES.EXAM_CLINICAL}
          emptyLabel={t("tmpl.noExamClinicalTemplates")}
          t={t}
          onEdit={(id) => openEdit("exam_clinical", id)}
          onDelete={deleteDocTemplate}
        />
      </section>

      {/* Solicitação de exames pré operatório */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-brand-500" /> {t("tmpl.examPreopSection")}
          </h2>
          {activeForm !== "exam_preop" && (
            <button type="button" onClick={() => openCreate("exam_preop")}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <Plus size={16} /> {t("tmpl.newDocTemplate")}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{t("tmpl.examPreopHint")}</p>
        {activeForm === "exam_preop" && (
          <ExamTemplateForm
            category={TEMPLATE_CATEGORIES.EXAM_PREOP}
            defaultTitle={t("tmpl.examPreopDefaultTitle")}
            editing={editingExamPreop}
            t={t}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}
        <TemplateSectionList
          items={examPreop.map((tpl) => {
            const parsed = parseExamTemplateBody(tpl.body);
            return {
              id: tpl.id,
              name: tpl.name,
              subtitle: parsed.items.slice(0, 3).join(" · ") + (parsed.items.length > 3 ? "…" : ""),
            };
          })}
          category={TEMPLATE_CATEGORIES.EXAM_PREOP}
          emptyLabel={t("tmpl.noExamPreopTemplates")}
          t={t}
          onEdit={(id) => openEdit("exam_preop", id)}
          onDelete={deleteDocTemplate}
        />
      </section>

      {/* Prescrição pós operatório */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Pill size={18} className="text-brand-500" /> {t("tmpl.rxPostopSection")}
          </h2>
          {activeForm !== "rx_postop" && (
            <button type="button" onClick={() => openCreate("rx_postop")}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <Plus size={16} /> {t("tmpl.newDocTemplate")}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{t("tmpl.rxPostopHint")}</p>
        {activeForm === "rx_postop" && (
          <RxTemplateForm
            editing={editingRxPostop}
            t={t}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}
        <TemplateSectionList
          items={rxPostop.map((tpl) => ({
            id: tpl.id,
            name: tpl.name,
            subtitle: tpl.medications.map((m) => m.name).join(" · "),
          }))}
          category={TEMPLATE_CATEGORIES.RX_POSTOP}
          emptyLabel={t("tmpl.noRxPostopTemplates")}
          t={t}
          onEdit={(id) => openEdit("rx_postop", id)}
          onDelete={deleteRxTemplate}
        />
      </section>

      {/* Atestado */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-brand-500" /> {t("tmpl.certificateSection")}
          </h2>
          {activeForm !== "certificate" && (
            <button type="button" onClick={() => openCreate("certificate")}
              className="text-sm font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <Plus size={16} /> {t("tmpl.newDocTemplate")}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">{t("tmpl.certificateHint")}</p>
        {activeForm === "certificate" && (
          <CertificateTemplateForm
            editing={editingCertificate}
            t={t}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}
        <TemplateSectionList
          items={certificates.map((tpl) => ({
            id: tpl.id,
            name: tpl.name,
            subtitle: tpl.title,
          }))}
          category={TEMPLATE_CATEGORIES.CERTIFICATE}
          emptyLabel={t("tmpl.noCertificateTemplates")}
          t={t}
          onEdit={(id) => openEdit("certificate", id)}
          onDelete={deleteDocTemplate}
        />
      </section>
    </div>
  );
}
