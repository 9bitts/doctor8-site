"use client";
// src/app/(dashboard)/professional/resources/page.tsx
// Biblioteca de Recursos — o profissional salva links do YouTube e arquivos
// para estudo e pode compartilhar com pacientes.

import { useState, useEffect } from "react";
import {
  BookOpen, Plus, X, Link2, Paperclip, Loader2, Trash2,
  Share2, CheckCircle2, AlertCircle, ExternalLink, Users,
  ChevronDown, ChevronUp, Search, Stethoscope, Phone, Mail,
  UserPlus, Pencil, Printer,
} from "lucide-react";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getProfessionLabel } from "@/lib/professions";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface Resource {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  hasFile: boolean;
  shareCount: number;
  createdAt: string;
}
interface Chart {
  id: string;
  firstName: string;
  lastName: string;
}
interface ProResult {
  id: string;
  name: string;
  specialty: string;
  email: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const { lang, t } = useI18n();
  const toast = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formTitle,   setFormTitle]   = useState("");
  const [formDesc,    setFormDesc]    = useState("");
  const [formType,    setFormType]    = useState<"link" | "file">("link");
  const [formUrl,     setFormUrl]     = useState("");
  const [formFile,    setFormFile]    = useState<File | null>(null);

  // Share panel state — patients
  const [shareResId,    setShareResId]    = useState<string | null>(null);
  const [charts,        setCharts]        = useState<Chart[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartSearch,   setChartSearch]   = useState("");
  const [sharingId,     setSharingId]     = useState<string | null>(null);
  const [shareMsg,      setShareMsg]      = useState<Record<string, string>>({});

  // Share panel state — professionals
  const [shareProResId,  setShareProResId]  = useState<string | null>(null);
  const [proQuery,       setProQuery]       = useState("");
  const [proResults,     setProResults]     = useState<ProResult[]>([]);
  const [proSearching,   setProSearching]   = useState(false);
  const [proShareMsg,    setProShareMsg]    = useState<Record<string, string>>({});
  const [proSharingId,   setProSharingId]   = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName,     setInviteName]     = useState("");
  const [inviteEmail,    setInviteEmail]    = useState("");
  const [invitePhone,    setInvitePhone]    = useState("");
  const [inviteSending,  setInviteSending]  = useState(false);
  const [inviteMsg,      setInviteMsg]      = useState<string | null>(null);
  // Expanded description
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load resources
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/resources");
        const data = await res.json();
        setResources(data.resources || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const resourceId = new URLSearchParams(window.location.search).get("resourceId");
    if (!resourceId) return;
    const el = document.getElementById(`resource-${resourceId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-brand-400", "bg-brand-50/40");
  }, [resources]);

  // Load charts for share panel
  async function openSharePanel(resId: string) {
    setShareResId(resId);
    setChartSearch("");
    setShareMsg({});
    if (charts.length === 0) {
      setChartsLoading(true);
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        setCharts(data.records || []);
      } catch { /* ignore */ }
      setChartsLoading(false);
    }
  }

  // Share with patient
  async function shareWith(resId: string, chartId: string) {
    setSharingId(chartId);
    try {
      const res = await fetch(`/api/professional/resources/${resId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientRecordId: chartId }),
      });
      if (res.ok) {
        setShareMsg((m) => ({ ...m, [chartId]: "ok" }));
        setResources((prev) =>
          prev.map((r) => r.id === resId ? { ...r, shareCount: r.shareCount + 1 } : r)
        );
      } else {
        setShareMsg((m) => ({ ...m, [chartId]: "error" }));
      }
    } catch {
      setShareMsg((m) => ({ ...m, [chartId]: "error" }));
    }
    setSharingId(null);
  }

  // Delete resource
  // Search professionals
  useEffect(() => {
    if (proQuery.length < 2) { setProResults([]); return; }
    const timer = setTimeout(async () => {
      setProSearching(true);
      try {
        const res = await fetch(`/api/professional/search-pros?q=${encodeURIComponent(proQuery)}`);
        const data = await res.json();
        setProResults(data.professionals || []);
      } catch { setProResults([]); }
      setProSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [proQuery]);

  // Share with professional (has account)
  async function shareWithPro(resId: string, proId: string) {
    setProSharingId(proId);
    try {
      const res = await fetch(`/api/professional/resources/${resId}/share-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId: proId }),
      });
      setProShareMsg((m) => ({ ...m, [proId]: res.ok ? "ok" : "error" }));
    } catch { setProShareMsg((m) => ({ ...m, [proId]: "error" })); }
    setProSharingId(null);
  }

  // Invite professional without account
  async function sendProInvite(resId: string) {
    if (!inviteEmail.trim()) { setInviteMsg("err:" + t("lib.proErrEmail")); return; }
    setInviteSending(true); setInviteMsg(null);
    try {
      const res = await fetch(`/api/professional/resources/${resId}/share-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), phone: invitePhone.trim() }),
      });
      if (res.ok) {
        setInviteMsg("ok");
        setInviteName(""); setInviteEmail(""); setInvitePhone("");
        setShowInviteForm(false);
      } else { setInviteMsg("err:Falha ao enviar."); }
    } catch { setInviteMsg("err:Erro de rede."); }
    setInviteSending(false);
  }

  async function deleteResource(id: string) {
    if (!confirm(t("lib.deleteConfirm"))) return;
    await fetch(`/api/professional/resources/${id}`, { method: "DELETE" });
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  function openEditForm(r: Resource) {
    setEditingId(r.id);
    setFormTitle(r.title);
    setFormDesc(r.content || "");
    setFormType(r.url ? "link" : r.hasFile ? "file" : "link");
    setFormUrl(r.url || "");
    setFormFile(null);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormUrl("");
    setFormFile(null);
    setFormType("link");
    setFormError(null);
  }

  function handlePrint(id: string) {
    window.open(`/api/professional/resources/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  // Submit form
  async function handleSubmit() {
    if (!formTitle.trim()) { setFormError(t("lib.errTitle")); return; }
    if (formUrl.trim() && !/^https?:\/\/.+/i.test(formUrl.trim())) {
      setFormError(t("lib.errUrl"));
      return;
    }
    setSaving(true); setFormError(null);

    try {
      let fileKey = "";
      if (formType === "file" && formFile) {
        const fd = new FormData();
        fd.append("file", formFile);
        fd.append("folder", "resources");
        const up = await fetch("/api/uploads", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) { setFormError(upData.error || t("lib.errUpload")); setSaving(false); return; }
        fileKey = upData.key;
      }

      const payload = {
        title:   formTitle.trim(),
        content: formDesc.trim(),
        url:     formType === "link" ? formUrl.trim() : "",
        ...(fileKey ? { fileKey } : {}),
      };

      const res = await fetch(
        editingId ? `/api/professional/resources/${editingId}` : "/api/professional/resources",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || t("lib.errGeneric")); toast.error(data.error || t("lib.errGeneric")); setSaving(false); return; }
      if (editingId) {
        setResources((prev) => prev.map((r) => r.id === editingId ? data : r));
        toast.success(t("toast.saveSuccess"));
      } else {
        setResources((prev) => [data, ...prev]);
        toast.success(t("toast.saveSuccess"));
      }
      closeForm();
    } catch { setFormError(t("rec.networkError")); toast.error(t("rec.networkError")); }
    setSaving(false);
  }

  const filteredCharts = charts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(chartSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 break-words">
            <BookOpen className="text-brand-500 shrink-0" size={24} /> {t("lib.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("lib.subtitle")}</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormTitle(""); setFormDesc(""); setFormUrl(""); setFormFile(null); setFormType("link"); setFormError(null); setShowForm(true); }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shrink-0 min-h-[44px]"
        >
          <Plus size={18} /> {t("lib.add")}
        </button>
      </div>

      {/* Resource list */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="font-semibold text-slate-600">{t("lib.empty")}</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{t("lib.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div id={`resource-${r.id}`} key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  {r.url ? <Link2 size={18} className="text-brand-500" /> : <Paperclip size={18} className="text-brand-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{r.title}</p>

                  {r.content && (
                    <div>
                      <p className={`text-sm text-slate-500 mt-0.5 ${!expanded[r.id] ? "line-clamp-2" : ""}`}>
                        {r.content}
                      </p>
                      {r.content.length > 120 && (
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}
                          className="text-xs text-brand-500 hover:underline mt-0.5 inline-flex items-center gap-0.5"
                        >
                          {expanded[r.id] ? <><ChevronUp size={12} /> ver menos</> : <><ChevronDown size={12} /> ver mais</>}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition"
                      >
                        <ExternalLink size={11} /> {t("lib.openLink")}
                      </a>
                    )}
                    {r.hasFile && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
                        <Paperclip size={11} /> {t("lib.attachment")}
                      </span>
                    )}
                    {r.shareCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-500 bg-brand-50 px-2.5 py-1 rounded-full">
                        <Users size={11} /> {r.shareCount} {t("lib.sharesCount")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <AiSummarizeButton resourceId={r.id} />
                  <button
                    onClick={() => handlePrint(r.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border text-slate-600 border-slate-200 hover:border-brand-200 hover:text-brand-500 transition"
                  >
                    <Printer size={13} /> {t("lib.print")}
                  </button>
                  <button
                    onClick={() => openEditForm(r)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border text-slate-600 border-slate-200 hover:border-brand-200 hover:text-brand-500 transition"
                  >
                    <Pencil size={13} /> {t("lib.edit")}
                  </button>
                  <button
                    onClick={() => shareResId === r.id ? setShareResId(null) : openSharePanel(r.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition
                      ${shareResId === r.id
                        ? "bg-brand-500 text-white border-brand-500"
                        : "text-slate-600 border-slate-200 hover:border-brand-200 hover:text-brand-500"}`}
                  >
                    <Share2 size={13} /> {t("lib.shareWith")}
                  </button>
                  <button
                    onClick={() => {
                      setShareProResId(shareProResId === r.id ? null : r.id);
                      setProQuery(""); setProResults([]); setProShareMsg({});
                      setShowInviteForm(false); setInviteMsg(null);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition
                      ${shareProResId === r.id
                        ? "bg-brand-500 text-white border-brand-500"
                        : "text-slate-600 border-slate-200 hover:border-brand-200 hover:text-brand-500"}`}
                  >
                    <Stethoscope size={13} /> {t("lib.shareWithPro")}
                  </button>
                  <button
                    onClick={() => deleteResource(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                    title={t("lib.delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Share panel — patients */}
              {shareResId === r.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={chartSearch}
                      onChange={(e) => setChartSearch(e.target.value)}
                      placeholder={t("lib.shareSearch")}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                    />
                  </div>
                  {chartsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader2 size={14} className="animate-spin" /> {t("lib.shareLoading")}
                    </div>
                  ) : filteredCharts.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("lib.shareNone")}</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredCharts.map((c) => {
                        const key = c.id;
                        const status = shareMsg[key];
                        return (
                          <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                            <span className="text-sm text-slate-700">{c.firstName} {c.lastName}</span>
                            {status === "ok" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-brand-500">
                                <CheckCircle2 size={13} /> {t("lib.shared")}
                              </span>
                            ) : status === "error" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                                <AlertCircle size={13} /> Erro
                              </span>
                            ) : (
                              <button
                                onClick={() => shareWith(r.id, c.id)}
                                disabled={sharingId === c.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-2.5 py-1 rounded-lg disabled:opacity-50 transition"
                              >
                                {sharingId === c.id
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : <Share2 size={12} />}
                                Compartilhar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Share panel — professionals */}
              {shareProResId === r.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    {t("lib.shareWithPro")}
                  </p>
                  {/* Search professionals with account */}
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={proQuery}
                      onChange={(e) => setProQuery(e.target.value)}
                      placeholder={t("lib.proSearch")}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                    />
                  </div>
                  {proSearching ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader2 size={14} className="animate-spin" /> Buscando...
                    </div>
                  ) : proQuery.length >= 2 && proResults.length === 0 ? (
                    <p className="text-sm text-slate-400 mb-2">{t("lib.proNotFound")}</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                      {proResults.map((p) => {
                        const status = proShareMsg[p.id];
                        return (
                          <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                            <div>
                              <p className="text-sm text-slate-700 font-medium">{p.name}</p>
                              <p className="text-xs text-slate-400">{getProfessionLabel(lang, p.specialty)}</p>
                            </div>
                            {status === "ok" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-brand-500">
                                <CheckCircle2 size={13} /> {t("lib.proNotified")}
                              </span>
                            ) : status === "error" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                                <AlertCircle size={13} /> Erro
                              </span>
                            ) : (
                              <button
                                onClick={() => shareWithPro(r.id, p.id)}
                                disabled={proSharingId === p.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-2.5 py-1 rounded-lg disabled:opacity-50 transition"
                              >
                                {proSharingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                                Compartilhar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Invite pro without account */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 transition"
                    >
                      <UserPlus size={13} /> {t("lib.proNoAccount")}
                    </button>
                    {showInviteForm && (
                      <div className="mt-3 space-y-2">
                        <input
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder={t("lib.proNameLabel")}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 outline-none"
                        />
                        <input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder={t("lib.proEmailLabel")}
                          type="email"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 outline-none"
                        />
                        <input
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                          placeholder={t("lib.proPhoneLabel")}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 outline-none"
                        />
                        {inviteMsg === "ok" && (
                          <p className="text-xs text-brand-500 flex items-center gap-1">
                            <CheckCircle2 size={12} /> {t("lib.proInvited")}
                          </p>
                        )}
                        {inviteMsg?.startsWith("err:") && (
                          <p className="text-xs text-rose-600">{inviteMsg.slice(4)}</p>
                        )}
                        <button
                          onClick={() => sendProInvite(r.id)}
                          disabled={inviteSending}
                          className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                          {inviteSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                          {t("lib.proInvite")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add resource modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{editingId ? t("lib.editModalTitle") : t("lib.modalTitle")}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.titleLabel")}</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("lib.titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.descLabel")}</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t("lib.descPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
                />
              </div>

              {/* Type toggle */}
              <div>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setFormType("link")}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition ${formType === "link" ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Link2 size={14} /> {t("lib.typeLink")}
                  </button>
                  <button
                    onClick={() => setFormType("file")}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition ${formType === "file" ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Paperclip size={14} /> {t("lib.typeFile")}
                  </button>
                </div>
              </div>

              {formType === "link" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.urlLabel")}</label>
                  <input
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder={t("lib.urlPlaceholder")}
                    type="url"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t("lib.fileLabel")} <span className="text-slate-400 font-normal">{t("lib.fileHint")}</span>
                  </label>
                  {editingId && resources.find((x) => x.id === editingId)?.hasFile && !formFile && (
                    <p className="text-xs text-slate-500 mb-2">{t("lib.keepExistingFile")}</p>
                  )}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:text-sm file:font-medium hover:file:bg-brand-100"
                  />
                  {formFile && (
                    <p className="text-xs text-slate-500 mt-1">{formFile.name} ({(formFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                  )}
                </div>
              )}

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("lib.cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("lib.saving") : t("lib.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
