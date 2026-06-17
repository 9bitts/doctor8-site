"use client";
// src/app/(dashboard)/professional/resources/page.tsx
// Biblioteca de Recursos — o profissional salva links do YouTube e arquivos
// para estudo e pode compartilhar com pacientes.

import { useState, useEffect } from "react";
import {
  BookOpen, Plus, X, Link2, Paperclip, Loader2, Trash2,
  Share2, CheckCircle2, AlertCircle, ExternalLink, Users,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";

// ── Inline texts (not yet in translations.ts) ──────────────────────────────
type Lang = "pt" | "en" | "es";
const T: Record<string, Record<Lang, string>> = {
  title:            { pt: "Biblioteca",                          en: "Library",                              es: "Biblioteca" },
  subtitle:         { pt: "Seus links e arquivos de referência. Compartilhe com pacientes.",
                      en: "Your reference links and files. Share with patients.",
                      es: "Tus enlaces y archivos de referencia. Comparte con pacientes." },
  add:              { pt: "Adicionar recurso",                   en: "Add resource",                         es: "Agregar recurso" },
  empty:            { pt: "Nenhum recurso ainda",                en: "No resources yet",                     es: "Aún no hay recursos" },
  emptyHint:        { pt: "Adicione links do YouTube ou arquivos que você usa e compartilha com pacientes.",
                      en: "Add YouTube links or files you use and share with patients.",
                      es: "Agrega enlaces de YouTube o archivos que usas y compartes con pacientes." },
  modalTitle:       { pt: "Novo recurso",                        en: "New resource",                         es: "Nuevo recurso" },
  titleLabel:       { pt: "Título *",                            en: "Title *",                              es: "Título *" },
  titlePlaceholder: { pt: "ex.: Vídeo sobre hipertensão",        en: "e.g. Video about hypertension",        es: "ej.: Vídeo sobre hipertensión" },
  descLabel:        { pt: "Descrição",                           en: "Description",                          es: "Descripción" },
  descPlaceholder:  { pt: "Observações sobre este recurso...",   en: "Notes about this resource...",         es: "Notas sobre este recurso..." },
  typeLink:         { pt: "Link (YouTube, etc.)",                en: "Link (YouTube, etc.)",                 es: "Enlace (YouTube, etc.)" },
  typeFile:         { pt: "Arquivo (PDF ou imagem)",             en: "File (PDF or image)",                  es: "Archivo (PDF o imagen)" },
  urlLabel:         { pt: "URL do vídeo/link *",                 en: "Video/link URL *",                     es: "URL del video/enlace *" },
  urlPlaceholder:   { pt: "https://youtube.com/watch?v=...",     en: "https://youtube.com/watch?v=...",      es: "https://youtube.com/watch?v=..." },
  fileLabel:        { pt: "Arquivo *",                           en: "File *",                               es: "Archivo *" },
  fileHint:         { pt: "(PDF ou imagem — máx. 50MB)",         en: "(PDF or image — max 50MB)",            es: "(PDF o imagen — máx. 50MB)" },
  save:             { pt: "Salvar",                              en: "Save",                                 es: "Guardar" },
  saving:           { pt: "Salvando...",                         en: "Saving...",                            es: "Guardando..." },
  cancel:           { pt: "Cancelar",                            en: "Cancel",                               es: "Cancelar" },
  errTitle:         { pt: "O título é obrigatório.",             en: "Title is required.",                   es: "El título es obligatorio." },
  errContent:       { pt: "Informe um link ou selecione um arquivo.", en: "Provide a link or select a file.", es: "Proporciona un enlace o selecciona un archivo." },
  errUrl:           { pt: "Informe uma URL válida.",             en: "Enter a valid URL.",                   es: "Ingresa una URL válida." },
  shareWith:        { pt: "Compartilhar com paciente",           en: "Share with patient",                   es: "Compartir con paciente" },
  shareSearch:      { pt: "Buscar paciente...",                  en: "Search patient...",                    es: "Buscar paciente..." },
  shareNone:        { pt: "Nenhum paciente encontrado.",         en: "No patient found.",                    es: "No se encontró ningún paciente." },
  shareLoading:     { pt: "Carregando pacientes...",             en: "Loading patients...",                  es: "Cargando pacientes..." },
  shared:           { pt: "Compartilhado!",                      en: "Shared!",                              es: "¡Compartido!" },
  sharesCount:      { pt: "paciente(s)",                         en: "patient(s)",                           es: "paciente(s)" },
  openLink:         { pt: "Abrir link",                          en: "Open link",                            es: "Abrir enlace" },
  attachment:       { pt: "Arquivo anexado",                     en: "File attached",                        es: "Archivo adjunto" },
  delete:           { pt: "Remover",                             en: "Remove",                               es: "Eliminar" },
  deleteConfirm:    { pt: "Remover este recurso?",               en: "Remove this resource?",                es: "¿Eliminar este recurso?" },
};

function tx(lang: Lang, key: string): string {
  return T[key]?.[lang] ?? T[key]?.["en"] ?? key;
}

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const l = document.documentElement.lang || navigator.language || "en";
  if (l.startsWith("pt")) return "pt";
  if (l.startsWith("es")) return "es";
  return "en";
}

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

// ── Component ──────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(detectLang()); }, []);
  const t = (k: string) => tx(lang, k);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formTitle,   setFormTitle]   = useState("");
  const [formDesc,    setFormDesc]    = useState("");
  const [formType,    setFormType]    = useState<"link" | "file">("link");
  const [formUrl,     setFormUrl]     = useState("");
  const [formFile,    setFormFile]    = useState<File | null>(null);

  // Share panel state
  const [shareResId,    setShareResId]    = useState<string | null>(null);
  const [charts,        setCharts]        = useState<Chart[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartSearch,   setChartSearch]   = useState("");
  const [sharingId,     setSharingId]     = useState<string | null>(null);
  const [shareMsg,      setShareMsg]      = useState<Record<string, string>>({});

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
  async function deleteResource(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/professional/resources/${id}`, { method: "DELETE" });
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  // Submit form
  async function handleSubmit() {
    if (!formTitle.trim()) { setFormError(t("errTitle")); return; }
    if (formType === "link" && !formUrl.trim()) { setFormError(t("errUrl")); return; }
    if (formType === "file" && !formFile) { setFormError(t("errContent")); return; }
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

      const res = await fetch("/api/professional/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:   formTitle.trim(),
          content: formDesc.trim(),
          url:     formType === "link" ? formUrl.trim() : "",
          fileKey: formType === "file" ? fileKey : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Error"); setSaving(false); return; }
      setResources((prev) => [data, ...prev]);
      setShowForm(false);
      setFormTitle(""); setFormDesc(""); setFormUrl(""); setFormFile(null); setFormType("link");
    } catch { setFormError("Network error."); }
    setSaving(false);
  }

  const filteredCharts = charts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(chartSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-emerald-500" size={24} /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null); }}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shrink-0"
        >
          <Plus size={18} /> {t("add")}
        </button>
      </div>

      {/* Resource list */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> Carregando...
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="font-semibold text-slate-600">{t("empty")}</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  {r.url ? <Link2 size={18} className="text-emerald-600" /> : <Paperclip size={18} className="text-emerald-600" />}
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
                          className="text-xs text-emerald-600 hover:underline mt-0.5 inline-flex items-center gap-0.5"
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
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition"
                      >
                        <ExternalLink size={11} /> {t("openLink")}
                      </a>
                    )}
                    {r.hasFile && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
                        <Paperclip size={11} /> {t("attachment")}
                      </span>
                    )}
                    {r.shareCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <Users size={11} /> {r.shareCount} {t("sharesCount")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => shareResId === r.id ? setShareResId(null) : openSharePanel(r.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition
                      ${shareResId === r.id
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"}`}
                  >
                    <Share2 size={13} /> {t("shareWith")}
                  </button>
                  <button
                    onClick={() => deleteResource(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                    title={t("delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Share panel */}
              {shareResId === r.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={chartSearch}
                      onChange={(e) => setChartSearch(e.target.value)}
                      placeholder={t("shareSearch")}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                  </div>
                  {chartsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader2 size={14} className="animate-spin" /> {t("shareLoading")}
                    </div>
                  ) : filteredCharts.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("shareNone")}</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredCharts.map((c) => {
                        const key = c.id;
                        const status = shareMsg[key];
                        return (
                          <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                            <span className="text-sm text-slate-700">{c.firstName} {c.lastName}</span>
                            {status === "ok" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 size={13} /> {t("shared")}
                              </span>
                            ) : status === "error" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                                <AlertCircle size={13} /> Erro
                              </span>
                            ) : (
                              <button
                                onClick={() => shareWith(r.id, c.id)}
                                disabled={sharingId === c.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 rounded-lg disabled:opacity-50 transition"
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
            </div>
          ))}
        </div>
      )}

      {/* Add resource modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{t("modalTitle")}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("titleLabel")}</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("descLabel")}</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t("descPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none"
                />
              </div>

              {/* Type toggle */}
              <div>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => setFormType("link")}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition ${formType === "link" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Link2 size={14} /> {t("typeLink")}
                  </button>
                  <button
                    onClick={() => setFormType("file")}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition ${formType === "file" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Paperclip size={14} /> {t("typeFile")}
                  </button>
                </div>
              </div>

              {formType === "link" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("urlLabel")}</label>
                  <input
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder={t("urlPlaceholder")}
                    type="url"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t("fileLabel")} <span className="text-slate-400 font-normal">{t("fileHint")}</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm file:font-medium hover:file:bg-emerald-100"
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
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
