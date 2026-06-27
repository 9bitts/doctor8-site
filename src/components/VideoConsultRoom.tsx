"use client";

// Shared teleconsult UI — video + patient chart sidebar for professionals.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Video, Clock, AlertCircle, ArrowLeft, ShieldCheck,
  ChevronRight, ChevronLeft, FileText, Plus, Send, Stethoscope,
  Pill, X, CheckCircle2, ClipboardList, PhoneOff,
} from "lucide-react";
import ConsultNotesAssistant, { ConsultNotesAssistantHandle } from "@/components/professional/ConsultNotesAssistant";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";

export interface VideoConsultData {
  url: string;
  token: string;
  userName: string;
  role: "patient" | "professional";
  otherParty: string;
  patientRecordId: string | null;
  patientUserId: string;
  scheduledAt: string;
  durationMins: number;
  appointmentId?: string | null;
  kind?: "appointment" | "jit" | "humanitarian";
  queueId?: string;
  entryId?: string;
}

interface ClinicalRecord {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  categoryName: string | null;
}

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
  addRecord:      { pt: "Adicionar registro", en: "Add record", es: "Agregar registro" },
  noChart:        { pt: "Vinculando ficha do paciente...", en: "Linking patient chart...", es: "Vinculando ficha del paciente..." },
  noteTitle:      { pt: "Anotação da consulta", en: "Consultation note", es: "Nota de consulta" },
  leaveCall:      { pt: "Sair da consulta", en: "Leave call", es: "Salir de la consulta" },
  leaveConfirm:   { pt: "Deseja sair da sala de vídeo?", en: "Leave the video room?", es: "¿Salir de la sala de video?" },
  leaveSavingNotes: {
    pt: "Gravação em andamento. Gerar resumo e salvar na ficha antes de sair?",
    en: "Recording in progress. Generate summary and save to chart before leaving?",
    es: "Grabación en curso. ¿Generar resumen y guardar en la ficha antes de salir?",
  },
  leaveProcessing: {
    pt: "Gerando evolução e salvando na ficha…",
    en: "Generating note and saving to chart…",
    es: "Generando evolución y guardando en la ficha…",
  },
  leaveDiscardRecording: {
    pt: "Gravação em andamento. Sair sem gerar o resumo?",
    en: "Recording in progress. Leave without generating the summary?",
    es: "Grabación en curso. ¿Salir sin generar el resumen?",
  },
};

function leaveDestination(data: VideoConsultData): string {
  const isPro = data.role === "professional";
  switch (data.kind) {
    case "humanitarian":
      return isPro ? "/humanitarian/volunteer" : "/patient";
    case "jit":
      return isPro ? "/professional/jit" : "/urgent";
    case "appointment":
    default:
      return isPro ? "/professional/appointments" : "/patient/appointments";
  }
}

export default function VideoConsultRoom({
  fetchSession,
}: {
  fetchSession: () => Promise<{ data?: VideoConsultData; error?: string; opensAt?: string }>;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  const [data, setData] = useState<VideoConsultData | null>(null);
  const [error, setError] = useState("");
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [leavingCall, setLeavingCall] = useState(false);
  const [humanitarianIntake, setHumanitarianIntake] = useState<{
    summary: Parameters<typeof HumanitarianIntakeSummary>[0]["summary"];
    chiefComplaint: string | null;
  } | null>(null);
  const notesAssistantRef = useRef<ConsultNotesAssistantHandle>(null);

  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;

  async function loadRoom() {
    setLoading(true);
    setError("");
    setOpensAt(null);
    try {
      const result = await fetchSession();
      if (result.opensAt) {
        setOpensAt(result.opensAt);
        setError(result.error || "");
        return;
      }
      if (result.error || !result.data) {
        setError(result.error || "Could not open the video room.");
        return;
      }
      setData(result.data);
      if (result.data.role === "professional" && result.data.patientRecordId) {
        loadRecords(result.data.patientRecordId);
      }
      if (
        result.data.role === "professional" &&
        result.data.kind === "humanitarian" &&
        result.data.entryId
      ) {
        loadHumanitarianIntake(result.data.entryId);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLang(detectLang());
    loadRoom();
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setSidebarOpen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecords(recordId: string) {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/professional/records/${recordId}`);
      const d = await res.json();
      setRecords((d.documents || []).slice(0, 5));
    } catch { /* ignore */ }
    setRecordsLoading(false);
  }

  async function loadHumanitarianIntake(entryId: string) {
    try {
      const res = await fetch(`/api/humanitarian/queue/${entryId}/intake?lang=${lang}`);
      const d = await res.json();
      if (res.ok) {
        setHumanitarianIntake({
          summary: d.summary ?? null,
          chiefComplaint: d.chiefComplaint ?? null,
        });
      }
    } catch { /* ignore */ }
  }

  async function saveNote() {
    if (!noteText.trim() || !data?.patientRecordId) return;
    setNoteSaving(true);
    try {
      await fetch("/api/professional/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: data.patientRecordId,
          title: t("noteTitle"),
          content: noteText.trim(),
        }),
      });
      setNoteSaved(true);
      setNoteText("");
      setTimeout(() => setNoteSaved(false), 2500);
      loadRecords(data.patientRecordId);
    } catch { /* ignore */ }
    setNoteSaving(false);
  }

  useEffect(() => {
    if (!opensAt) return;
    const interval = setInterval(() => {
      const diff = new Date(opensAt).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setOpensAt(null);
        loadRoom();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opensAt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">{t("preparing")}</p>
      </div>
    );
  }

  if (opensAt) {
    return (
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
          <button type="button" onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition">
            <ArrowLeft size={15} /> {t("back")}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">{t("unavailable")}</h1>
          <p className="text-slate-400 text-sm mb-8">{error}</p>
          <button type="button" onClick={() => router.back()} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2 mx-auto">
            <ArrowLeft size={15} /> {t("back")}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isPro = data.role === "professional";
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  const roomData = data;

  async function handleLeaveCall() {
    const assistant = notesAssistantRef.current;
    if (assistant?.isRecording()) {
      if (assistant.shouldAutoSaveOnLeave()) {
        if (!window.confirm(t("leaveSavingNotes"))) return;
        setLeavingCall(true);
        await assistant.finalizeOnLeave();
        setLeavingCall(false);
      } else if (!window.confirm(t("leaveDiscardRecording"))) {
        return;
      }
    } else if (!window.confirm(t("leaveConfirm"))) {
      return;
    }
    router.push(leaveDestination(roomData));
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleLeaveCall}
            disabled={leavingCall}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:text-red-200 transition disabled:opacity-50"
            aria-label={t("leaveCall")}
          >
            {leavingCall
              ? <Loader2 size={14} className="animate-spin shrink-0" />
              : <PhoneOff size={14} className="shrink-0" />}
            <span className="hidden sm:inline">{leavingCall ? t("leaveProcessing") : t("leaveCall")}</span>
          </button>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 hidden sm:flex">
            <Video size={16} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{t("consultation")} {data.otherParty}</p>
            <p className="text-slate-500 text-xs">
              {new Date(data.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} · {data.durationMins} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPro && (
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
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
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>{t("encrypted")}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative flex-col lg:flex-row min-h-0">
        {/* Video — always visible; on mobile stays above the chart drawer */}
        <div
          className={`flex flex-col min-h-0 shrink-0 transition-all duration-300 ${
            isPro && sidebarOpen
              ? "h-[52vh] lg:h-auto lg:flex-1 lg:w-[65%]"
              : "flex-1 w-full"
          }`}
        >
          <iframe
            src={`${data.url}?t=${data.token}`}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
            className="flex-1 w-full h-full border-0 min-h-[200px]"
            title="Teleconsultation"
          />
        </div>

        {/* Chart sidebar — bottom drawer on mobile, side panel on desktop */}
        {isPro && sidebarOpen && (
          <div className="flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-hidden z-20 flex-1 min-h-0 lg:flex-none lg:w-[35%] rounded-t-2xl lg:rounded-none shadow-[0_-8px_30px_rgba(0,0,0,0.4)] lg:shadow-none">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Stethoscope size={16} className="text-emerald-400 shrink-0" />
                <span className="text-white text-sm font-semibold">{t("patientChart")}</span>
                <span className="text-slate-500 text-xs truncate">— {data.otherParty}</span>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {data.kind === "humanitarian" && isPro && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-300 mb-2">SOS Venezuela — Ficha</p>
                  <HumanitarianIntakeSummary
                    summary={humanitarianIntake?.summary ?? null}
                    chiefComplaint={humanitarianIntake?.chiefComplaint}
                    compact
                    dark
                  />
                </div>
              )}

              {!data.patientRecordId && data.kind !== "humanitarian" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                  {t("noChart")}
                </div>
              )}

              {data.patientRecordId && (
                <>
                  <a
                    href={`/professional/patients/${data.patientRecordId}?newRecord=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl transition"
                  >
                    <Plus size={16} /> {t("addRecord")}
                  </a>

                  <ConsultNotesAssistant
                    ref={notesAssistantRef}
                    lang={lang}
                    patientRecordId={data.patientRecordId}
                    appointmentId={data.appointmentId}
                    patientName={data.otherParty}
                    onSaved={() => {
                      if (data.patientRecordId) loadRecords(data.patientRecordId);
                    }}
                  />

                  <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText size={13} className="text-emerald-400" /> {t("quickNote")}
                    </p>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={t("notePlaceholder")}
                      rows={4}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) saveNote(); }}
                    />
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={!noteText.trim() || noteSaving}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-slate-600 hover:bg-slate-500 disabled:opacity-40 py-2 rounded-lg transition"
                    >
                      {noteSaved
                        ? <><CheckCircle2 size={13} /> {t("saved")}</>
                        : noteSaving
                          ? <><Loader2 size={13} className="animate-spin" /> {t("saving")}</>
                          : <><Send size={13} /> {t("saveNote")}</>
                      }
                    </button>
                  </div>

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
                            {r.content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.content}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

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

      {isPro && !sidebarOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
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
