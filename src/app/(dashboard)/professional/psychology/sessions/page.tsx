"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { SESSION_FORMATS, type SessionFormat } from "@/lib/psychology-templates";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import AiPsychologyDraftButton from "@/components/psychologist/AiPsychologyDraftButton";
import {
  ArrowLeft, ClipboardList, Loader2, Save, User, Search, Clock, CheckCircle2,
  Copy, Printer, Pencil, Share2, Mail, AlertCircle,
} from "lucide-react";
import VideoConsultReturnBanner from "@/components/professional/VideoConsultReturnBanner";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { readChartDeepLink } from "@/lib/video-chart-nav";

interface Chart { id: string; firstName: string; lastName: string; }
interface SessionNote {
  id: string;
  title: string;
  format: SessionFormat;
  fields: Record<string, string>;
  sessionDurationMins: number | null;
  renderedBody: string;
  patientName: string;
  patientRecordId: string | null;
  createdAt: string;
  signatureStatus: string | null;
}

const ACTION_TEXTS: Record<string, Record<string, string>> = {
  copy:             { pt: "Copiar texto", en: "Copy text", es: "Copiar texto" },
  copied:           { pt: "Copiado!", en: "Copied!", es: "¡Copiado!" },
  print:            { pt: "Imprimir", en: "Print", es: "Imprimir" },
  edit:             { pt: "Editar", en: "Edit", es: "Editar" },
  share:            { pt: "Compartilhar com paciente", en: "Share with patient", es: "Compartir con paciente" },
  shared:           { pt: "Compartilhado com o paciente", en: "Shared with patient", es: "Compartido con el paciente" },
  invited:          { pt: "Convite enviado", en: "Invitation sent", es: "Invitación enviada" },
  needsInvite:      { pt: "Paciente ainda não tem conta", en: "Patient has no account yet", es: "El paciente aún no tiene cuenta" },
  sendInvite:       { pt: "Enviar convite por e-mail", en: "Send invite email", es: "Enviar invitación por correo" },
  noEmail:          { pt: "Sem conta e sem e-mail na ficha — adicione um e-mail para convidar", en: "No account and no email on file — add an email to the chart to invite", es: "Sin cuenta y sin correo en la ficha — agregue un correo para invitar" },
  editTitle:        { pt: "Editar nota de sessão", en: "Edit session note", es: "Editar nota de sesión" },
  editSubtitle:     { pt: "Atualize o registro na ficha do paciente.", en: "Update the record in the patient chart.", es: "Actualice el registro en la ficha del paciente." },
  update:           { pt: "Salvar alterações", en: "Save changes", es: "Guardar cambios" },
  updateError:      { pt: "Não foi possível salvar as alterações.", en: "Could not save changes.", es: "No se pudieron guardar los cambios." },
};

export default function PsychologySessionsPage() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);
  const locale = localeOf(lang as Lang);
  const at = (key: string) => ACTION_TEXTS[key]?.[lang] ?? ACTION_TEXTS[key]?.en ?? key;

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [format, setFormat] = useState<SessionFormat>("DAP");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(50);
  const [rawNotes, setRawNotes] = useState("");
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [consultReturnUrl, setConsultReturnUrl] = useState<string | null>(null);
  const [lockPatient, setLockPatient] = useState(false);

  const formatDef = SESSION_FORMATS.find((f) => f.id === format)!;

  useEffect(() => {
    (async () => {
      try {
        const [notesRes, chartsRes] = await Promise.all([
          fetch("/api/professional/psychology/session-notes"),
          fetch("/api/professional/records"),
        ]);
        const notesData = await notesRes.json();
        const chartsData = await chartsRes.json();
        setNotes(notesData.notes || []);
        setCharts(chartsData.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const { patientRecordId, returnUrl, view: viewParam } = readChartDeepLink();
    if (returnUrl) setConsultReturnUrl(returnUrl);
    if (!patientRecordId || !returnUrl) return;
    setLockPatient(true);
    const chart = charts.find((c) => c.id === patientRecordId);
    if (chart) {
      setSelectedPatient(chart);
      if (viewParam === "create") setView("create");
    }
  }, [loading, charts]);

  useEffect(() => {
    if (view === "edit" && editingNote) return;
    const empty: Record<string, string> = {};
    formatDef.fields.forEach((f) => { empty[f.key] = ""; });
    setFields(empty);
  }, [format, formatDef.fields, view, editingNote]);

  const filteredCharts = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  function fieldLabel(key: string) {
    const f = formatDef.fields.find((x) => x.key === key);
    if (!f) return key;
    if (lang === "en") return f.labelEn;
    if (lang === "es") return f.labelEs;
    return f.labelPt;
  }

  function fieldPlaceholder(key: string) {
    return formatDef.fields.find((x) => x.key === key)?.placeholderPt || "";
  }

  function resetForm() {
    setSelectedPatient(null);
    setFormat("DAP");
    setDuration(50);
    setFields({});
    setRawNotes("");
    setEditingNote(null);
    setError("");
    setPatientQuery("");
  }

  function openCreate() {
    resetForm();
    setView("create");
  }

  function openEdit(note: SessionNote) {
    setEditingNote(note);
    setFormat(note.format);
    setFields(note.fields || {});
    setDuration(note.sessionDurationMins || 50);
    setSelectedPatient(
      note.patientRecordId
        ? charts.find((c) => c.id === note.patientRecordId) || {
          id: note.patientRecordId,
          firstName: note.patientName.split(" ")[0] || note.patientName,
          lastName: note.patientName.split(" ").slice(1).join(" ") || "",
        }
        : null,
    );
    setError("");
    setView("edit");
  }

  async function handleCopy(note: SessionNote) {
    const dateStr = new Date(note.createdAt).toLocaleString(locale, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const text = [
      `Paciente: ${note.patientName}`,
      `Título: ${note.title}`,
      `Data: ${dateStr}`,
      "",
      note.renderedBody,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  function handlePrint(noteId: string) {
    window.open(`/api/professional/documents/${noteId}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function handleShare(docId: string) {
    setSharingId(docId);
    setShareStatus((s) => ({ ...s, [docId]: "" }));
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || t("rec.updateFailed")) }));
      } else if (data.shared) {
        setShareStatus((s) => ({ ...s, [docId]: "shared" }));
      } else if (data.needsInvite) {
        setShareStatus((s) => ({ ...s, [docId]: data.hasEmail ? "needsInvite" : "noEmail" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:" + t("rec.networkError") }));
    }
    setSharingId(null);
  }

  async function handleInvite(docId: string) {
    setSharingId(docId);
    try {
      const res = await fetch(`/api/professional/documents/${docId}/share`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setShareStatus((s) => ({ ...s, [docId]: "error:" + (data.error || t("rx3.inviteError")) }));
      } else if (data.invited) {
        setShareStatus((s) => ({ ...s, [docId]: "invited" }));
      }
    } catch {
      setShareStatus((s) => ({ ...s, [docId]: "error:" + t("rec.networkError") }));
    }
    setSharingId(null);
  }

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("psy.sessions.needPatient")); return; }
    const hasContent = Object.values(fields).some((v) => v.trim());
    if (!hasContent) { setError(t("psy.sessions.needContent")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/professional/psychology/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selectedPatient.id,
          format,
          fields,
          sessionDurationMins: duration,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [{
          id: data.id,
          title: data.title,
          format: data.format,
          fields: data.fields,
          sessionDurationMins: duration,
          renderedBody: data.renderedBody,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          patientRecordId: selectedPatient.id,
          createdAt: data.createdAt,
          signatureStatus: null,
        }, ...prev]);
        resetForm();
        setView("list");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : t("psy.sessions.saveError"));
      }
    } finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editingNote) return;
    setError("");
    const hasContent = Object.values(fields).some((v) => v.trim());
    if (!hasContent) { setError(t("psy.sessions.needContent")); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/professional/psychology/session-notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, fields, sessionDurationMins: duration }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => prev.map((n) => n.id === editingNote.id ? {
          ...n,
          format: data.format,
          fields: data.fields,
          sessionDurationMins: data.sessionDurationMins,
          renderedBody: data.renderedBody,
          patientName: data.patientName,
        } : n));
        resetForm();
        setView("list");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : at("updateError"));
      }
    } finally { setSaving(false); }
  }

  function renderShareAction(note: SessionNote) {
    const status = shareStatus[note.id] || "";
    const isSharing = sharingId === note.id;

    if (status === "shared") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg">
          <CheckCircle2 size={14} /> {t("rec.shareShared")}
        </span>
      );
    }
    if (status === "invited") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg">
          <Mail size={14} /> {t("rec.shareInvited")}
        </span>
      );
    }
    if (status === "needsInvite") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle size={14} /> {t("rec.shareNeedsInvite")}
          </span>
          <button
            onClick={() => handleInvite(note.id)}
            disabled={isSharing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {t("rec.sendInvite")}
          </button>
        </div>
      );
    }
    if (status === "noEmail") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle size={14} /> {t("rec.shareNoEmail")}
        </span>
      );
    }
    if (status.startsWith("error:")) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-rose-600">{status.slice(6)}</span>
          <button
            onClick={() => handleShare(note.id)}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
          >
            {t("rec.retry")}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleShare(note.id)}
        disabled={isSharing}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
      >
        {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
        {t("rec.shareWithPatient")}
      </button>
    );
  }

  function renderNoteForm(opts: { isEdit: boolean }) {
    const { isEdit } = opts;
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24">
        <VideoConsultReturnBanner
          returnUrl={consultReturnUrl}
          patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined}
          lang={lang as "pt" | "en" | "es"}
        />
        <button
          onClick={() => { resetForm(); setView("list"); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium"
        >
          <ArrowLeft size={16} /> {t("psy.sessions.back")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? at("editTitle") : t("psy.sessions.createTitle")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isEdit ? at("editSubtitle") : t("psy.sessions.createSubtitle")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("psy.sessions.selectPatient")}</label>
          {selectedPatient ? (
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-600 text-sm">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              </div>
              {!isEdit && !lockPatient && (
                <button onClick={() => setSelectedPatient(null)} className="text-xs text-slate-500 hover:text-red-500">
                  {t("common.cancel")}
                </button>
              )}
            </div>
          ) : lockPatient ? (
            <p className="text-sm text-slate-500">{t("psy.sessions.selectPatient")}</p>
          ) : charts.length === 0 ? (
            <NoPatientChartsEmptyState variant="violet" compact />
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder={t("psy.sessions.searchPatient")}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredCharts.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2 text-center">{t("pat.searchEmpty")}</p>
                ) : filteredCharts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedPatient(c)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-violet-50 text-left text-sm"
                  >
                    <User size={16} className="text-slate-400" />
                    {c.firstName} {c.lastName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <label className="text-sm font-semibold text-slate-800">{t("psy.sessions.format")}</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {SESSION_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition text-left ${
                  format === f.id ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600 hover:border-violet-200"
                }`}
              >
                {lang === "en" ? f.labelEn : lang === "es" ? f.labelEs : f.labelPt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Clock size={16} className="text-slate-400" />
            <label className="text-sm text-slate-600">{t("psy.sessions.duration")}</label>
            <input
              type="number"
              min={15}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-sm"
            />
            <span className="text-sm text-slate-400">min</span>
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4 space-y-3">
              <label className="text-sm font-semibold text-slate-700">{t("psy.ai.rawNotes")}</label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder={t("psy.ai.rawNotesPlaceholder")}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              />
              <AiPsychologyDraftButton
                format={format}
                rawNotes={rawNotes}
                durationMins={duration}
                patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined}
                onDraft={(draft) => setFields((prev) => ({ ...prev, ...draft }))}
                disabled={!selectedPatient}
              />
            </div>
          )}

          {formatDef.fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-semibold text-slate-700">{fieldLabel(f.key)}</label>
              <textarea
                value={fields[f.key] || ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={fieldPlaceholder(f.key)}
                rows={4}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-y"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={isEdit ? handleUpdate : handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isEdit ? at("update") : t("psy.sessions.save")}
        </button>
      </div>
    );
  }

  if (view === "create") return renderNoteForm({ isEdit: false });
  if (view === "edit") return renderNoteForm({ isEdit: true });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
            <ArrowLeft size={16} /> {t("psy.backToHub")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-violet-600" />
            {t("psy.mod.sessions.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("psy.mod.sessions.desc")}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
        >
          {t("psy.sessions.new")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-500" size={28} /></div>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t("psy.sessions.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{n.patientName}</p>
                    <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{n.format}</span>
                    {n.signatureStatus === "SIGNED" && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> {t("psy.sessions.signed")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <pre className="mt-3 text-sm text-slate-600 whitespace-pre-wrap font-sans line-clamp-4">{n.renderedBody}</pre>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopy(n)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  {copiedId === n.id ? <CheckCircle2 size={14} className="text-violet-600" /> : <Copy size={14} />}
                  {copiedId === n.id ? at("copied") : at("copy")}
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(n.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Printer size={14} /> {at("print")}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(n)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Pencil size={14} /> {at("edit")}
                </button>
                <AiSummarizeButton documentId={n.id} />
                {renderShareAction(n)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
