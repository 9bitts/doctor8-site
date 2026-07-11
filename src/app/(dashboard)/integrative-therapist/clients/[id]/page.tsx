"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import { PICS_PRACTICES } from "@/lib/pics/practices";
import {
  hasStructuredTemplate,
  emptyStructuredValues,
  structuredValuesHaveContent,
  type StructuredValues,
} from "@/lib/pics/consult-templates";
import IntegrativeStructuredForm from "@/components/integrative-therapist/IntegrativeStructuredForm";
import IntegrativeReferenceLibrary from "@/components/integrative-therapist/IntegrativeReferenceLibrary";
import { Loader2, ArrowLeft, User, FileText, Share2 } from "lucide-react";

interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mainPractice: string | null;
  chiefComplaint: string | null;
  treatmentGoals: string | null;
  notes: string | null;
  sessionCount: number;
  defaultVisitType: "first" | "return";
  processStartDate: string | null;
  hasAccount: boolean;
  archivedAt: string | null;
}

interface Note {
  id: string;
  title: string;
  body: string;
  practiceSlug: string | null;
  format?: "FREE" | "STRUCTURED";
  createdAt: string;
  shared?: boolean;
}

type Tab = "summary" | "sessions";

export default function IntegrativeClientDetailPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<Tab>("summary");
  const [client, setClient] = useState<ClientData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"not_found" | "generic" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [mainPractice, setMainPractice] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [treatmentGoals, setTreatmentGoals] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [phone, setPhone] = useState("");

  const [content, setContent] = useState("");
  const [practiceSlug, setPracticeSlug] = useState("");
  const [structuredValues, setStructuredValues] = useState<StructuredValues>({});
  const [noteSaving, setNoteSaving] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const langCode = lang.startsWith("pt") ? "pt" : lang.startsWith("es") ? "es" : "en";
  const locale = lang.startsWith("pt") ? "pt-BR" : lang.startsWith("es") ? "es-ES" : "en-US";
  const usesStructured = hasStructuredTemplate(practiceSlug);

  useEffect(() => {
    if (usesStructured) setStructuredValues(emptyStructuredValues(practiceSlug));
  }, [practiceSlug, usesStructured]);

  async function loadClient() {
    const res = await fetch(`/api/integrative-therapist/clients/${clientId}`);
    const d = await res.json();
    if (res.status === 404) {
      setLoadError("not_found");
      setClient(null);
      return false;
    }
    if (!res.ok) {
      setLoadError("generic");
      toast.error(typeof d.error === "string" ? d.error : t("it.err.loadClient"));
      return false;
    }
    if (d.client) {
      setClient(d.client);
      setEditFirstName(d.client.firstName || "");
      setEditLastName(d.client.lastName || "");
      setEditEmail(d.client.email || "");
      setMainPractice(d.client.mainPractice || "");
      setChiefComplaint(d.client.chiefComplaint || "");
      setTreatmentGoals(d.client.treatmentGoals || "");
      setClientNotes(d.client.notes || "");
      setPhone(d.client.phone || "");
      setLoadError(null);
    }
    return true;
  }

  async function loadNotes() {
    const res = await fetch(`/api/integrative-therapist/session-notes?clientId=${clientId}`);
    const d = await res.json();
    if (!res.ok) {
      toast.error(typeof d.error === "string" ? d.error : t("it.err.loadNotes"));
      return;
    }
    setNotes(d.notes || []);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await Promise.all([loadClient(), loadNotes()]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  async function saveSummary(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/integrative-therapist/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail || null,
          mainPractice: mainPractice || null,
          chiefComplaint,
          treatmentGoals,
          notes: clientNotes,
          phone,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast.success(t("toast.saveSuccess"));
        await loadClient();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === "string" ? d.error : t("it.err.saveSummary"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function shareNote(noteId: string) {
    setSharingId(noteId);
    try {
      const res = await fetch(`/api/integrative-therapist/session-notes/${noteId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("it.err.shareNote"));
        return;
      }
      if (data.shared) {
        toast.success(t("it.share.shared"));
        await loadNotes();
        return;
      }
      if (data.needsInvite && data.hasEmail) {
        const inviteRes = await fetch(`/api/integrative-therapist/session-notes/${noteId}/share`, {
          method: "PUT",
        });
        const inviteData = await inviteRes.json();
        if (inviteRes.ok) {
          toast.success(
            t("it.share.inviteSent").replace("{{email}}", client?.email ?? ""),
          );
        } else {
          toast.error(
            typeof inviteData.error === "string" ? inviteData.error : t("it.err.shareNote"),
          );
        }
        return;
      }
      toast.error(t("it.share.noEmail"));
    } catch {
      toast.error(t("it.err.shareNote"));
    } finally {
      setSharingId(null);
    }
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const canSave = usesStructured
      ? structuredValuesHaveContent(structuredValues)
      : content.trim().length > 0;
    if (!canSave) return;
    setNoteSaving(true);
    try {
      const payload: Record<string, unknown> = {
        integrativeClientRecordId: clientId,
        practiceSlug: practiceSlug || undefined,
        lang: langCode,
      };
      if (usesStructured) payload.structured = structuredValues;
      else payload.content = content;
      const res = await fetch("/api/integrative-therapist/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setContent("");
        if (usesStructured) setStructuredValues(emptyStructuredValues(practiceSlug));
        toast.success(t("toast.saveSuccess"));
        await Promise.all([loadNotes(), loadClient()]);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === "string" ? d.error : t("it.err.saveNote"));
      }
    } finally {
      setNoteSaving(false);
    }
  }

  async function archiveClient() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/integrative-therapist/clients/${clientId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("it.err.archiveClient"));
        return;
      }
      toast.success(t("it.client.archived"));
      window.location.href = "/integrative-therapist/clients";
    } catch {
      toast.error(t("it.err.archiveClient"));
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
    }
  }

  function practiceLabel(slug: string | null) {
    if (!slug) return null;
    const p = PICS_PRACTICES.find((x) => x.slug === slug);
    if (!p) return slug;
    if (lang.startsWith("pt")) return p.labelPt;
    if (lang.startsWith("en")) return p.labelEn;
    return p.labelEs;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError === "not_found" || !client) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-lg font-semibold text-slate-800">{t("it.client.notFound")}</p>
        <p className="text-sm text-slate-500">{t("it.client.notFoundDesc")}</p>
        <Link
          href="/integrative-therapist/clients"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800"
        >
          <ArrowLeft size={16} /> {t("it.clients.back")}
        </Link>
      </div>
    );
  }

  const visitBadge =
    client?.defaultVisitType === "first"
      ? t("it.consult.firstVisit")
      : t("it.consult.returnVisit");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/integrative-therapist/clients"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> {t("it.clients.back")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {client?.firstName} {client?.lastName}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">
              {visitBadge}
            </span>
            {client?.mainPractice && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                {practiceLabel(client.mainPractice)}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              {client?.sessionCount ?? 0} {t("it.client.sessionsCount")}
            </span>
          </div>
        </div>
        <Link
          href={`/integrative-therapist/clients/${clientId}/consult`}
          className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shrink-0"
        >
          {t("it.consult.start")}
        </Link>
      </div>

      {tab === "summary" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowArchiveModal(true)}
            className="text-xs font-medium text-slate-500 hover:text-rose-600"
          >
            {t("it.client.archive")}
          </button>
        </div>
      )}

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">{t("it.client.archiveTitle")}</h3>
            <p className="text-sm text-slate-600">{t("it.client.archiveDesc")}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={archiving}
                onClick={() => void archiveClient()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {archiving ? <Loader2 size={14} className="animate-spin inline" /> : t("it.client.archiveConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { id: "summary" as Tab, icon: User, label: t("it.client.tabSummary") },
          { id: "sessions" as Tab, icon: FileText, label: t("it.client.tabSessions") },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg transition ${
              tab === id ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <form onSubmit={saveSummary} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          {saved && (
            <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
              {t("avail.saved")}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.firstName")}</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.lastName")}</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("reg.email")}</label>
            <input
              type="email"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              disabled={client.hasAccount}
            />
            {client.hasAccount && (
              <p className="text-[11px] text-slate-500 mt-1">{t("it.client.emailLinkedHint")}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.settings.phone")}</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.clients.mainPractice")}</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={mainPractice}
              onChange={(e) => setMainPractice(e.target.value)}
            >
              <option value="">{t("it.clients.selectPractice")}</option>
              {PICS_PRACTICES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {lang.startsWith("pt") ? p.labelPt : lang.startsWith("en") ? p.labelEn : p.labelEs}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.clients.chiefComplaint")}</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[80px]"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.clients.treatmentGoals")}</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[80px]"
              value={treatmentGoals}
              onChange={(e) => setTreatmentGoals(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.client.clinicalNotes")}</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[80px]"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin inline" /> : t("common.save")}
          </button>
        </form>
      )}

      {tab === "sessions" && (
        <>
          <form onSubmit={saveNote} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="font-semibold text-slate-800 text-sm">{t("it.sessions.addNote")}</h2>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("it.sessions.practiceUsed")}</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                value={practiceSlug}
                onChange={(e) => setPracticeSlug(e.target.value)}
              >
                <option value="">{t("it.clients.selectPractice")}</option>
                {PICS_PRACTICES.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {lang.startsWith("pt") ? p.labelPt : lang.startsWith("en") ? p.labelEn : p.labelEs}
                  </option>
                ))}
              </select>
            </div>
            {practiceSlug && (
              <IntegrativeReferenceLibrary lang={langCode} practiceSlug={practiceSlug} />
            )}
            {usesStructured ? (
              <IntegrativeStructuredForm
                lang={langCode}
                practiceSlug={practiceSlug}
                values={structuredValues}
                onChange={setStructuredValues}
              />
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-600">{t("it.sessions.note")}</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[120px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("it.sessions.placeholder")}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={
                noteSaving
                || (usesStructured ? !structuredValuesHaveContent(structuredValues) : !content.trim())
              }
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
            >
              {noteSaving ? <Loader2 size={14} className="animate-spin inline" /> : t("it.sessions.save")}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {notes.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-12">{t("it.sessions.empty")}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {notes.map((n) => (
                  <div key={n.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString(locale)}
                        </span>
                        {n.shared ? (
                          <span className="text-[10px] font-bold text-teal-700">
                            {t("it.sessions.shared")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={sharingId === n.id}
                            onClick={() => void shareNote(n.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50"
                          >
                            <Share2 size={12} />
                            {sharingId === n.id ? "…" : t("it.sessions.share")}
                          </button>
                        )}
                      </div>
                    </div>
                    {n.practiceSlug && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 mb-2 mr-1">
                        {practiceLabel(n.practiceSlug)}
                      </span>
                    )}
                    {n.format === "STRUCTURED" && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-2">
                        {t("it.tpl.structuredTitle")}
                      </span>
                    )}
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
