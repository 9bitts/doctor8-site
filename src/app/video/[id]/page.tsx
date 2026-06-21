"use client";

// src/app/video/[id]/page.tsx
// Full-screen teleconsultation room with optional clinical sidebar for professionals.
// - Patient: full-screen video (unchanged)
// - Professional: split layout — video (left) + collapsible patient chart sidebar (right)
//   Sidebar shows: quick note field (saves as clinical record), last records, prescribe button.

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Video, Clock, AlertCircle, ArrowLeft, ShieldCheck,
  ChevronRight, ChevronLeft, FileText, Plus, Send, Stethoscope,
  Pill, X, CheckCircle2, ClipboardList,
} from "lucide-react";

interface VideoData {
  url:            string;
  token:          string;
  userName:       string;
  role:           "patient" | "professional";
  otherParty:     string;
  patientRecordId:string | null;
  patientUserId:  string;
  scheduledAt:    string;
  durationMins:   number;
  appointmentId:  string;
}

interface ClinicalRecord {
  id:        string;
  title:     string;
  content:   string | null;
  createdAt: string;
  categoryName: string | null;
}

// ── Inline texts ─────────────────────────────────────────────────────────────
type Lang = "pt" | "en" | "es";
const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const s = localStorage.getItem(LANG_KEY) || "";
    if (s.startsWith("pt")) return "pt";
    if (s.startsWith("es")) return "es";
  } catch { /* ignore */ }
  return "en";
}

const T: Record<string, Record<Lang, string>> = {
  preparing:      { pt: "Preparando sua sala de consulta...", en: "Preparing your consultation room...", es: "Preparando tu sala de consulta..." },
  almostThere:    { pt: "Quase lá!", en: "Almost there!", es: "¡Casi listo!" },
  roomOpens:      { pt: "A sala abre 10 minutos antes da consulta.", en: "The room opens 10 minutes before the appointment.", es: "La sala abre 10 minutos antes de la cita." },
  opensIn:        { pt: "A sala abre em", en: "Room opens in", es: "La sala abre en" },
  back:           { pt: "Voltar", en: "Back", es: "Volver" },
  unavailable:    { pt: "Sala indisponível", en: "Room unavailable", es: "Sala no disponible" },
  consultation:   { pt: "Consulta com", en: "Consultation with", es: "Consulta con" },
  encrypted:      { pt: "Criptografado · HIPAA & LGPD", en: "Encrypted · HIPAA & LGPD", es: "Cifrado · HIPAA & LGPD" },
  patientChart:   { pt: "Ficha do Paciente", en: "Patient Chart", es: "Ficha del Paciente" },
  quickNote:      { pt: "Anotação rápida", en: "Quick note", es: "Nota rápida" },
  notePlaceholder:{ pt: "Digite a anotação clínica...", en: "Type clinical note...", es: "Escribe la nota clínica..." },
  saveNote:       { pt: "Salvar", en: "Save", es: "Guardar" },
  saving:         { pt: "Salvando...", en: "Saving...", es: "Guardando..." },
  saved:          { pt: "Salvo!", en: "Saved!", es: "¡Guardado!" },
  recentRecords:  { pt: "Registros recentes", en: "Recent records", es: "Registros recientes" },
  noRecords:      { pt: "Nenhum registro ainda.", en: "No records yet.", es: "Sin registros aún." },
  prescribe:      { pt: "Prescrever", en: "Prescribe", es: "Prescribir" },
  openChart:      { pt: "Abrir ficha completa", en: "Open full chart", es: "Abrir ficha completa" },
  noChart:        { pt: "Nenhuma ficha vinculada a este paciente.", en: "No chart linked to this patient.", es: "Sin ficha vinculada a este paciente." },
  noteTitle:      { pt: "Anotação da consulta", en: "Consultation note", es: "Nota de consulta" },
};

export default function VideoCallPage() {
  const params        = useParams();
  const router        = useRouter();
  const appointmentId = params.id as string;
  const [lang, setLang] = useState<Lang>("en");

  const [data,      setData]      = useState<VideoData | null>(null);
  const [error,     setError]     = useState("");
  const [opensAt,   setOpensAt]   = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState("");

  // Sidebar state (professional only)
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [records,      setRecords]      = useState<ClinicalRecord[]>([]);
  const [noteText,     setNoteText]     = useState("");
  const [noteSaving,   setNoteSaving]   = useState(false);
  const [noteSaved,    setNoteSaved]    = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;

  useEffect(() => {
    setLang(detectLang());
    if (appointmentId) fetchRoom();
  }, [appointmentId]);

  async function fetchRoom() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/video`);
      const d   = await res.json();
      if (!res.ok) {
        if (d.error === "TOO_EARLY") { setOpensAt(d.opensAt); setError(d.message); }
        else setError(d.message || d.error || "Could not open the video room.");
        return;
      }
      setData(d);
      // Load patient records if professional and has chart
      if (d.role === "professional" && d.patientRecordId) {
        loadRecords(d.patientRecordId);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(recordId: string) {
    setRecordsLoading(true);
    try {
      const res  = await fetch(`/api/professional/records/${recordId}`);
      const d    = await res.json();
      setRecords((d.documents || []).slice(0, 5));
    } catch { /* ignore */ }
    setRecordsLoading(false);
  }

  async function saveNote() {
    if (!noteText.trim() || !data?.patientRecordId) return;
    setNoteSaving(true);
    try {
      await fetch(`/api/professional/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          patientRecordId: data.patientRecordId,
          title:           t("noteTitle"),
          content:         noteText.trim(),
          type:            "CLINICAL_NOTE",
        }),
      });
      setNoteSaved(true);
      setNoteText("");
      setTimeout(() => setNoteSaved(false), 2500);
      if (data.patientRecordId) loadRecords(data.patientRecordId);
    } catch { /* ignore */ }
    setNoteSaving(false);
  }

  // Countdown
  useEffect(() => {
    if (!opensAt) return;
    const interval = setInterval(() => {
      const diff = new Date(opensAt).getTime() - Date.now();
      if (diff <= 0) { clearInterval(interval); setOpensAt(null); fetchRoom(); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${String(m).padStart(2,"0")}m` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [opensAt]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 size={32} className="animate-spin text-emerald-400" />
      <p className="text-slate-400 text-sm">{t("preparing")}</p>
    </div>
  );

  // ── Waiting room ──────────────────────────────────────────────────────────
  if (opensAt) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <Clock size={36} className="text-emerald-400" />
        </div>
        <h1 className="text-white text-xl font-bold mb-2">{t("almostThere")}</h1>
        <p className="text-slate-400 text-sm mb-6">{t("roomOpens")}</p>
        <div className="bg-slate-800/60 rounded-2xl py-5 mb-6">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">{t("opensIn")}</p>
          <p className="text-emerald-400 font-bold text-4xl tabular-nums">{countdown || "..."}</p>
        </div>
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition">
          <ArrowLeft size={15} /> {t("back")}
        </button>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={36} className="text-red-400" />
        </div>
        <h1 className="text-white text-xl font-bold mb-2">{t("unavailable")}</h1>
        <p className="text-slate-400 text-sm mb-8">{error}</p>
        <button onClick={() => router.back()} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2 mx-auto">
          <ArrowLeft size={15} /> {t("back")}
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  const isPro = data.role === "professional";

  // ── Video room ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Video size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{t("consultation")} {data.otherParty}</p>
            <p className="text-slate-500 text-xs">
              {new Date(data.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {data.durationMins} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle sidebar button — professional only */}
          {isPro && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                sidebarOpen
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <ClipboardList size={14} />
              <span className="hidden sm:inline">{t("patientChart")}</span>
              {sidebarOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">{t("encrypted")}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video iframe */}
        <div className={`flex flex-col transition-all duration-300 ${isPro && sidebarOpen ? "w-full lg:w-[65%]" : "w-full"}`}>
          <iframe
            src={`${data.url}?t=${data.token}`}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
            className="flex-1 w-full border-0"
            title="Teleconsultation"
          />
        </div>

        {/* Sidebar — professional only */}
        {isPro && sidebarOpen && (
          <div className="hidden lg:flex w-[35%] flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">

            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-emerald-400" />
                <span className="text-white text-sm font-semibold">{t("patientChart")}</span>
                <span className="text-slate-500 text-xs">— {data.otherParty}</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* No chart warning */}
              {!data.patientRecordId && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                  {t("noChart")}
                </div>
              )}

              {/* Quick note */}
              {data.patientRecordId && (
                <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-emerald-400" /> {t("quickNote")}
                  </p>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) saveNote(); }}
                  />
                  <button
                    onClick={saveNote}
                    disabled={!noteText.trim() || noteSaving}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2 rounded-lg transition"
                  >
                    {noteSaved
                      ? <><CheckCircle2 size={13} /> {t("saved")}</>
                      : noteSaving
                        ? <><Loader2 size={13} className="animate-spin" /> {t("saving")}</>
                        : <><Send size={13} /> {t("saveNote")}</>
                    }
                  </button>
                  <p className="text-xs text-slate-600 text-center">Ctrl+Enter para salvar</p>
                </div>
              )}

              {/* Recent records */}
              {data.patientRecordId && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <ClipboardList size={13} /> {t("recentRecords")}
                  </p>
                  {recordsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-500" /></div>
                  ) : records.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-3">{t("noRecords")}</p>
                  ) : (
                    <div className="space-y-2">
                      {records.map((r) => (
                        <div key={r.id} className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                          <p className="text-xs font-medium text-slate-300 truncate">{r.title}</p>
                          {r.content && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.content}</p>
                          )}
                          <p className="text-xs text-slate-600 mt-1">
                            {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar footer — action buttons */}
            {data.patientRecordId && (
              <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
                <a
                  href={`/professional/prescriptions?patientRecordId=${data.patientRecordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg transition w-full"
                >
                  <Pill size={13} /> {t("prescribe")}
                </a>
                <a
                  href={`/professional/patients/${data.patientRecordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 py-2 rounded-lg transition w-full"
                >
                  <FileText size={13} /> {t("openChart")}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile sidebar toggle — shows as bottom sheet hint */}
      {isPro && !sidebarOpen && data.patientRecordId && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition"
          >
            <ClipboardList size={14} /> {t("patientChart")}
          </button>
        </div>
      )}
    </div>
  );
}
