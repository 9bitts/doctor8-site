"use client";
// Biblioteca de Recursos ? o psicanalista salva links e arquivos de refer?ncia.

import { useState, useEffect } from "react";
import {
  BookOpen, Plus, X, Link2, Paperclip, Loader2, Trash2,
  Share2, CheckCircle2, AlertCircle, ExternalLink, Users,
  ChevronDown, ChevronUp, Search, Pencil, Printer,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Resource {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  hasFile: boolean;
  shareCount: number;
  createdAt: string;
}

interface Analysand {
  id: string;
  firstName: string;
  lastName: string;
}

export default function PsychoanalystResourcesPage() {
  const { t } = useI18n();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc,  setFormDesc]  = useState("");
  const [formType,  setFormType]  = useState<"link" | "file">("link");
  const [formUrl,   setFormUrl]   = useState("");
  const [formFile,  setFormFile]  = useState<File | null>(null);

  const [shareResId,    setShareResId]    = useState<string | null>(null);
  const [analysands,    setAnalysands]    = useState<Analysand[]>([]);
  const [anLoading,     setAnLoading]     = useState(false);
  const [anSearch,      setAnSearch]      = useState("");
  const [sharingId,     setSharingId]     = useState<string | null>(null);
  const [shareMsg,      setShareMsg]      = useState<Record<string, string>>({});
  const [expanded,      setExpanded]      = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/psychoanalyst/resources");
        const data = await res.json();
        setResources(data.resources || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  async function openSharePanel(resId: string) {
    setShareResId(resId);
    setAnSearch("");
    setShareMsg({});
    if (analysands.length === 0) {
      setAnLoading(true);
      try {
        const res = await fetch("/api/psychoanalyst/analysands");
        const data = await res.json();
        setAnalysands(data.analysands || []);
      } catch { /* ignore */ }
      setAnLoading(false);
    }
  }

  async function shareWith(resId: string, analysandId: string) {
    setSharingId(analysandId);
    try {
      const res = await fetch(`/api/psychoanalyst/resources/${resId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysandRecordId: analysandId }),
      });
      if (res.ok) {
        setShareMsg((m) => ({ ...m, [analysandId]: "ok" }));
        setResources((prev) =>
          prev.map((r) => r.id === resId ? { ...r, shareCount: r.shareCount + 1 } : r)
        );
      } else {
        setShareMsg((m) => ({ ...m, [analysandId]: "error" }));
      }
    } catch {
      setShareMsg((m) => ({ ...m, [analysandId]: "error" }));
    }
    setSharingId(null);
  }

  async function deleteResource(id: string) {
    if (!confirm(t("lib.deleteConfirm"))) return;
    await fetch(`/api/psychoanalyst/resources/${id}`, { method: "DELETE" });
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
    window.open(`/api/psychoanalyst/resources/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

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
        if (!up.ok) { setFormError(upData.error || "Upload failed."); setSaving(false); return; }
        fileKey = upData.key;
      }

      const payload = {
        title:   formTitle.trim(),
        content: formDesc.trim(),
        url:     formType === "link" ? formUrl.trim() : "",
        ...(fileKey ? { fileKey } : {}),
      };

      const res = await fetch(
        editingId ? `/api/psychoanalyst/resources/${editingId}` : "/api/psychoanalyst/resources",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Error"); setSaving(false); return; }
      if (editingId) {
        setResources((prev) => prev.map((r) => r.id === editingId ? data : r));
      } else {
        setResources((prev) => [data, ...prev]);
      }
      closeForm();
    } catch { setFormError("Network error."); }
    setSaving(false);
  }

  const filteredAnalysands = analysands.filter((a) =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(anSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-brand-500" size={24} /> {t("lib.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("lib.subtitleAnalyst")}</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormTitle(""); setFormDesc(""); setFormUrl(""); setFormFile(null); setFormType("link"); setFormError(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shrink-0"
        >
          <Plus size={18} /> {t("lib.add")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> Carregando...
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="font-semibold text-slate-600">{t("lib.empty")}</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{t("lib.emptyHintAnalyst")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
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
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition">
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
                        <Users size={11} /> {r.shareCount} {t("lib.sharesCountAnalyst")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
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
                      ${shareResId === r.id ? "bg-brand-500 text-white border-brand-500" : "text-slate-600 border-slate-200 hover:border-brand-200 hover:text-brand-500"}`}
                  >
                    <Share2 size={13} /> {t("lib.shareWithAnalysand")}
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

              {shareResId === r.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={anSearch}
                      onChange={(e) => setAnSearch(e.target.value)}
                      placeholder={t("lib.shareSearchAnalyst")}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                    />
                  </div>
                  {anLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader2 size={14} className="animate-spin" /> {t("lib.shareLoadingAnalyst")}
                    </div>
                  ) : filteredAnalysands.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("lib.shareNoneAnalyst")}</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredAnalysands.map((a) => {
                        const status = shareMsg[a.id];
                        return (
                          <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                            <span className="text-sm text-slate-700">{a.firstName} {a.lastName}</span>
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
                                onClick={() => shareWith(r.id, a.id)}
                                disabled={sharingId === a.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-500 px-2.5 py-1 rounded-lg disabled:opacity-50 transition"
                              >
                                {sharingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
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
            </div>
          ))}
        </div>
      )}

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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("lib.titleLabel")}</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("lib.titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>
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
                <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">
                  {t("lib.cancel")}
                </button>
                <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50">
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
