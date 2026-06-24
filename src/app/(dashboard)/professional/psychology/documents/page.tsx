"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CFP_DOCUMENT_TEMPLATES, type CfpDocumentTemplateId } from "@/lib/psychology-templates";
import {
  ArrowLeft, FileText, Loader2, Save, User, Search, PenLine,
} from "lucide-react";

interface Chart { id: string; firstName: string; lastName: string; }

export default function PsychologyDocumentsPage() {
  const { t, lang } = useI18n();

  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CfpDocumentTemplateId | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        setCharts(data.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const tpl = CFP_DOCUMENT_TEMPLATES.find((x) => x.id === selectedTemplate);

  function tplTitle(t: typeof CFP_DOCUMENT_TEMPLATES[0]) {
    if (lang === "en") return t.titleEn;
    if (lang === "es") return t.titleEs;
    return t.titlePt;
  }

  function tplDesc(t: typeof CFP_DOCUMENT_TEMPLATES[0]) {
    if (lang === "en") return t.descriptionEn;
    if (lang === "es") return t.descriptionEs;
    return t.descriptionPt;
  }

  function tplBody(t: typeof CFP_DOCUMENT_TEMPLATES[0]) {
    if (lang === "en") return t.bodyEn;
    if (lang === "es") return t.bodyEs;
    return t.bodyPt;
  }

  function selectTemplate(id: CfpDocumentTemplateId) {
    const t = CFP_DOCUMENT_TEMPLATES.find((x) => x.id === id)!;
    setSelectedTemplate(id);
    setTitle(tplTitle(t));
    setBody(tplBody(t));
    setSuccess(false);
  }

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  async function handleSave() {
    setError("");
    setSuccess(false);
    if (!selectedPatient) { setError(t("psy.docs.needPatient")); return; }
    if (!body.trim()) { setError(t("psy.docs.needBody")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          type: selectedTemplate === "TDIC_CONSENT" ? "OTHER" : "CLINICAL_NOTE",
          title,
          content: body,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("psy.docs.saveError"));
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/professional/psychology" className="flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={24} className="text-sky-600" />
          {t("psy.mod.documents.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.mod.documents.desc")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CFP_DOCUMENT_TEMPLATES.map((templ) => (
          <button
            key={templ.id}
            onClick={() => selectTemplate(templ.id)}
            className={`text-left p-4 rounded-2xl border transition ${
              selectedTemplate === templ.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-sky-200"
            }`}
          >
            <p className="font-semibold text-slate-800 text-sm">{tplTitle(templ)}</p>
            <p className="text-xs text-slate-500 mt-1">{tplDesc(templ)}</p>
          </button>
        ))}
      </div>

      {tpl && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-sky-700 bg-sky-50 rounded-xl px-3 py-2">
            <PenLine size={16} />
            {t("psy.docs.signHint")}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">{t("psy.docs.title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">{t("psy.sessions.selectPatient")}</label>
            {selectedPatient ? (
              <div className="mt-1.5 flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center font-bold text-sky-600 text-sm">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </div>
                <p className="font-medium text-slate-800 flex-1">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <button onClick={() => setSelectedPatient(null)} className="text-xs text-slate-500">{t("common.cancel")}</button>
              </div>
            ) : !loading && (
              <>
                <div className="relative mt-1.5">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder={t("psy.docs.searchPatient")} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto mt-2">
                  {filteredCharts.map((c) => (
                    <button key={c.id} onClick={() => setSelectedPatient(c)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sky-50 text-left text-sm">
                      <User size={16} className="text-slate-400" />{c.firstName} {c.lastName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">{t("psy.docs.body")}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono resize-y" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{t("psy.docs.saved")}</p>}

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 disabled:opacity-60">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {t("psy.docs.save")}
          </button>
        </div>
      )}
    </div>
  );
}
