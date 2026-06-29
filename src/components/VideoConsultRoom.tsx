"use client";

// Shared teleconsult UI — video + patient chart sidebar for professionals.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Video, Clock, AlertCircle, ArrowLeft, ShieldCheck,
  ChevronRight, ChevronLeft, FileText, Plus, Send, Stethoscope,
  Pill, X, CheckCircle2, ClipboardList, PhoneOff, FlaskConical,
  ScrollText, BarChart3, ExternalLink, MessageCircle, Syringe, Activity,
} from "lucide-react";
import ConsultNotesAssistant, { ConsultNotesAssistantHandle } from "@/components/professional/ConsultNotesAssistant";
import IntegrativeConsultPanel from "@/components/integrative-therapist/IntegrativeConsultPanel";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";
import DailyPrebuiltEmbed, { type DailyPrebuiltHandle } from "@/components/DailyPrebuiltEmbed";
import { useConsultSessionKeepalive } from "@/hooks/useConsultSessionKeepalive";
import { translate } from "@/lib/i18n/translations";
import { buildVideoChartLinks, videoReturnPath } from "@/lib/video-chart-nav";
import { navigateBack, videoBackFallback } from "@/lib/safe-nav";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export interface VideoConsultData {
  url: string;
  token: string;
  userName: string;
  role: "patient" | "professional";
  otherParty: string;
  patientRecordId: string | null;
  analysandRecordId?: string | null;
  integrativeClientRecordId?: string | null;
  providerPanel?: "professional" | "psychoanalyst" | "integrative_therapist";
  patientUserId: string;
  scheduledAt: string;
  durationMins: number;
  appointmentId?: string | null;
  kind?: "appointment" | "jit" | "humanitarian";
  queueId?: string;
  entryId?: string;
  cloudRecordingEnabled?: boolean;
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
  dental:         { pt: "Odontograma", en: "Dental chart", es: "Odontograma" },
  vaccines:       { pt: "Vacinas", en: "Vaccines", es: "Vacunas" },
  evolution:      { pt: "Evolução", en: "Evolution", es: "Evolución" },
  diagnoses:      { pt: "Diagnósticos", en: "Diagnoses", es: "Diagnósticos" },
  saving:         { pt: "Salvando...", en: "Saving...", es: "Guardando..." },
  saved:          { pt: "Salvo!", en: "Saved!", es: "¡Guardado!" },
  recentRecords:  { pt: "Registros recentes", en: "Recent records", es: "Registros recientes" },
  noRecords:      { pt: "Nenhum registro ainda.", en: "No records yet.", es: "Sin registros aún." },
  prescribe:      { pt: "Prescrever", en: "Prescribe", es: "Prescribir" },
  openChart:      { pt: "Abrir ficha completa", en: "Open full chart", es: "Abrir ficha completa" },
  openAnalysand:  { pt: "Abrir ficha do analisando", en: "Open analysand chart", es: "Abrir ficha del analizado" },
  addSessionNote: { pt: "Nova anotação de sessão", en: "New session note", es: "Nueva nota de sesión" },
  addRecord:      { pt: "Adicionar registro", en: "Add record", es: "Agregar registro" },
  requestExam:    { pt: "Solicitar exame", en: "Request exam", es: "Solicitar examen" },
  issueDocument:  { pt: "Emitir documento", en: "Issue document", es: "Emitir documento" },
  psychSession:   { pt: "Nota de sessão (psi)", en: "Session note (psych)", es: "Nota de sesión (psi)" },
  psychScale:     { pt: "Aplicar escala", en: "Apply scale", es: "Aplicar escala" },
  psychDocument:  { pt: "Documento (psi)", en: "Document (psych)", es: "Documento (psi)" },
  chartActions:   { pt: "Ações na ficha deste paciente", en: "Actions for this patient", es: "Acciones en la ficha de este paciente" },
  openRecord:     { pt: "Ver na ficha", en: "View in chart", es: "Ver en la ficha" },
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
      return isPro
        ? (data.providerPanel === "psychoanalyst"
          ? "/psychoanalyst"
          : data.providerPanel === "integrative_therapist"
            ? "/integrative-therapist"
            : "/humanitarian/volunteer")
        : `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
    case "jit":
      return isPro ? "/professional/jit" : "/urgent";
    case "appointment":
    default:
      if (isPro && data.providerPanel === "integrative_therapist") {
        return "/integrative-therapist/appointments";
      }
      if (isPro && data.providerPanel === "psychoanalyst") {
        return "/psychoanalyst/appointments";
      }
      return isPro ? "/professional/appointments" : "/patient/appointments";
  }
}

export interface VideoConsultFetchResult {
  data?: VideoConsultData;
  error?: string;
  opensAt?: string;
  whatsappHandoff?: { professionalName: string; campaignSlug?: string };
  meetHandoff?: {
    professionalName: string;
    campaignSlug?: string;
    meetUrl?: string | null;
    backHref?: string;
    backLabelKey?: string;
  };
}

export default function VideoConsultRoom({
  fetchSession,
}: {
  fetchSession: () => Promise<VideoConsultFetchResult>;
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
  const [whatsappHandoff, setWhatsappHandoff] = useState<{
    professionalName: string;
    campaignSlug?: string;
  } | null>(null);
  const [meetHandoff, setMeetHandoff] = useState<{
    professionalName: string;
    campaignSlug?: string;
    meetUrl?: string | null;
    backHref?: string;
    backLabelKey?: string;
  } | null>(null);
  const [meetLoading, setMeetLoading] = useState(false);
  const [videoEmbedError, setVideoEmbedError] = useState<string | null>(null);
  const [humanitarianIntake, setHumanitarianIntake] = useState<{
    summary: Parameters<typeof HumanitarianIntakeSummary>[0]["summary"];
    chiefComplaint: string | null;
  } | null>(null);
  const [integrativePracticeSlug, setIntegrativePracticeSlug] = useState("");
  const notesAssistantRef = useRef<ConsultNotesAssistantHandle>(null);
  const dailyRef = useRef<DailyPrebuiltHandle>(null);

  useConsultSessionKeepalive(data);

  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;

  async function loadRoom() {
    setLoading(true);
    setError("");
    setOpensAt(null);
    try {
      const result = await fetchSession();
      if (result.whatsappHandoff) {
        setWhatsappHandoff(result.whatsappHandoff);
        return;
      }
      if (result.meetHandoff) {
        setMeetHandoff(result.meetHandoff);
        return;
      }
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
      const chartId =
        result.data.integrativeClientRecordId
        || result.data.analysandRecordId
        || result.data.patientRecordId;
      if (result.data.role === "professional" && chartId) {
        loadRecords(chartId, result.data.providerPanel);
        if (result.data.providerPanel === "integrative_therapist") {
          setSidebarOpen(true);
        }
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

  useEffect(() => {
    if (!data || data.kind !== "humanitarian" || data.role !== "patient" || !data.entryId) {
      return;
    }
    const entryId = data.entryId;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/humanitarian/queue?entryId=${entryId}&lang=${lang}`);
        const d = await res.json();
        if (
          res.ok &&
          d.entry?.status === "DONE" &&
          d.entry?.completionChannel === "WHATSAPP"
        ) {
          setWhatsappHandoff({
            professionalName: d.entry.professionalName || "",
            campaignSlug: d.entry.campaignSlug,
          });
          setData(null);
        }
        if (
          res.ok &&
          d.entry?.status === "DONE" &&
          d.entry?.completionChannel === "GOOGLE_MEET"
        ) {
          setMeetHandoff({
            professionalName: d.entry.professionalName || "",
            campaignSlug: d.entry.campaignSlug,
            meetUrl: d.entry.meetingUrl,
          });
          setData(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [data, lang]);

  useEffect(() => {
    if (!data || data.kind !== "appointment" || !data.appointmentId) {
      return;
    }
    const appointmentId = data.appointmentId;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/video`);
        const d = await res.json();
        if (d.handoff === "google_meet" || d.error === "MEET_HANDOFF") {
          const backHref = data.role === "professional"
            ? "/professional/appointments"
            : "/patient/appointments";
          setMeetHandoff({
            professionalName: d.professionalName || "",
            meetUrl: d.meetUrl,
            backHref,
            backLabelKey: "appt.page.meetHandoffBack",
          });
          setData(null);
          void dailyRef.current?.leave();
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [data]);

  async function requestAppointmentMeet(appointmentId: string) {
    setMeetLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/google-meet`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        const msg =
          d.error === "MEET_DISABLED"
            ? translate(lang, "hum.vol.meetDisabled")
            : d.error === "MEET_CREATE_FAILED"
              ? translate(lang, "hum.vol.meetCreateFailed")
              : d.message || translate(lang, "hum.page.networkError");
        window.alert(msg);
        return;
      }
      if (d.meetUrl) {
        const backHref = data?.role === "professional"
          ? "/professional/appointments"
          : "/patient/appointments";
        setMeetHandoff({
          professionalName: d.providerName || "",
          meetUrl: d.meetUrl,
          backHref,
          backLabelKey: "appt.page.meetHandoffBack",
        });
        setData(null);
        await dailyRef.current?.leave();
      }
    } catch {
      window.alert(translate(lang, "hum.page.networkError"));
    }
    setMeetLoading(false);
  }

  async function loadRecords(recordId: string, providerPanel?: VideoConsultData["providerPanel"]) {
    setRecordsLoading(true);
    try {
      if (providerPanel === "psychoanalyst") {
        const res = await fetch(`/api/psychoanalyst/session-notes?analysandId=${recordId}`);
        const d = await res.json();
        setRecords(
          (d.notes || []).slice(0, 5).map((n: { id: string; title: string; body: string }) => ({
            id: n.id,
            title: n.title,
            content: n.body,
            createdAt: "",
            categoryName: null,
          })),
        );
      } else if (providerPanel === "integrative_therapist") {
        const res = await fetch(`/api/integrative-therapist/session-notes?clientId=${recordId}`);
        const d = await res.json();
        setRecords(
          (d.notes || []).slice(0, 5).map((n: { id: string; title: string; body: string }) => ({
            id: n.id,
            title: n.title,
            content: n.body,
            createdAt: "",
            categoryName: null,
          })),
        );
      } else {
        const res = await fetch(`/api/professional/records/${recordId}`);
        const d = await res.json();
        setRecords((d.documents || []).slice(0, 5));
      }
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
    const chartId = data?.integrativeClientRecordId || data?.analysandRecordId || data?.patientRecordId;
    if (!noteText.trim() || !chartId || !data) return;
    setNoteSaving(true);
    try {
      if (data.providerPanel === "integrative_therapist") {
        await fetch("/api/integrative-therapist/session-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integrativeClientRecordId: chartId,
            content: noteText.trim(),
            practiceSlug: integrativePracticeSlug || undefined,
            appointmentId: data.appointmentId || undefined,
          }),
        });
      } else if (data.providerPanel === "psychoanalyst") {
        await fetch("/api/psychoanalyst/session-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysandRecordId: chartId,
            content: noteText.trim(),
            appointmentId: data.appointmentId || undefined,
          }),
        });
      } else {
        await fetch("/api/professional/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientRecordId: chartId,
            title: t("noteTitle"),
            content: noteText.trim(),
          }),
        });
      }
      setNoteSaved(true);
      setNoteText("");
      setTimeout(() => setNoteSaved(false), 2500);
      loadRecords(chartId, data.providerPanel);
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

  if (meetHandoff) {
    const slug = meetHandoff.campaignSlug || "venezuela-terremoto-2026";
    const backHref = meetHandoff.backHref ?? `/humanitarian/${slug}`;
    const backLabel = meetHandoff.backLabelKey
      ? translate(lang, meetHandoff.backLabelKey)
      : translate(lang, "hum.page.meetHandoffBack");
    const desc = translate(lang, "hum.page.meetHandoffDesc").replace(
      "{{professional}}",
      meetHandoff.professionalName || translate(lang, "hum.vol.patientAssigned"),
    );
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/15 border border-blue-500/40 flex items-center justify-center mx-auto mb-6">
            <Video size={36} className="text-blue-400" />
          </div>
          <h1 className="text-white text-xl font-bold mb-3">
            {translate(lang, "hum.page.meetHandoffTitle")}
          </h1>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">{desc}</p>
          <p className="text-slate-500 text-xs mb-6">
            {translate(lang, "hum.page.meetHandoffHint")}
          </p>
          {meetHandoff.meetUrl && (
            <a
              href={meetHandoff.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition mb-3"
            >
              {translate(lang, "hum.page.meetHandoffJoin")}
            </a>
          )}
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  if (whatsappHandoff) {
    const slug = whatsappHandoff.campaignSlug || "venezuela-terremoto-2026";
    const desc = translate(lang, "hum.page.whatsappHandoffDesc").replace(
      "{{professional}}",
      whatsappHandoff.professionalName || translate(lang, "hum.vol.patientAssigned"),
    );
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#25D366]/15 border border-[#25D366]/40 flex items-center justify-center mx-auto mb-6">
            <MessageCircle size={36} className="text-[#25D366]" />
          </div>
          <h1 className="text-white text-xl font-bold mb-3">
            {translate(lang, "hum.page.whatsappHandoffTitle")}
          </h1>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">{desc}</p>
          <p className="text-slate-500 text-xs mb-8">
            {translate(lang, "hum.page.whatsappHandoffHint")}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/humanitarian/${slug}`)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
          >
            {translate(lang, "hum.page.whatsappHandoffBack")}
          </button>
        </div>
      </div>
    );
  }

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
          <button type="button" onClick={() => navigateBack(router, videoBackFallback())} className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition">
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
          <button type="button" onClick={() => navigateBack(router, videoBackFallback())} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2 mx-auto">
            <ArrowLeft size={15} /> {t("back")}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isPro = data.role === "professional";
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const chartId = data.integrativeClientRecordId || data.analysandRecordId || data.patientRecordId;
  const panel = data.providerPanel ?? "professional";
  const isPsychoanalyst = panel === "psychoanalyst";
  const isIntegrative = panel === "integrative_therapist";
  const returnUrl = videoReturnPath(data);
  const chartLinks = chartId ? buildVideoChartLinks(chartId, returnUrl, panel) : null;

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

    if (
      roomData.kind === "humanitarian" &&
      roomData.role === "patient" &&
      roomData.entryId
    ) {
      setLeavingCall(true);
      try {
        await fetch("/api/humanitarian/queue/patient-leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: roomData.entryId }),
        });
      } catch { /* still leave room */ }
      setLeavingCall(false);
    }

    await dailyRef.current?.leave();
    router.push(leaveDestination(roomData));
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleLeaveCall}
            disabled={leavingCall}
            className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400/40 shadow-md shadow-red-950/40 transition disabled:opacity-50 min-h-[44px]"
            aria-label={t("leaveCall")}
          >
            {leavingCall
              ? <Loader2 size={16} className="animate-spin shrink-0" />
              : <PhoneOff size={16} className="shrink-0" />}
            <span>{leavingCall ? t("leaveProcessing") : t("leaveCall")}</span>
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
          {isPro && data.kind === "appointment" && data.appointmentId && (
            <button
              type="button"
              onClick={() => requestAppointmentMeet(data.appointmentId!)}
              disabled={meetLoading}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition disabled:opacity-50"
            >
              {meetLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ExternalLink size={14} />
              )}
              {translate(lang, "hum.vol.requestMeet")}
            </button>
          )}
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

      {data.cloudRecordingEnabled && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 text-center">
          <p className="text-amber-200/90 text-xs leading-relaxed">
            {translate(lang, "video.cloudRecordingNotice")}
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative flex-col lg:flex-row min-h-0">
        {/* Video — always visible; on mobile stays above the chart drawer */}
        <div
          className={`relative flex flex-col min-h-0 shrink-0 transition-all duration-300 ${
            isPro && sidebarOpen
              ? "h-[52vh] lg:h-auto lg:flex-1 lg:w-[65%]"
              : "flex-1 w-full"
          }`}
        >
          <DailyPrebuiltEmbed
            ref={dailyRef}
            url={data.url}
            token={data.token}
            className="flex-1 w-full h-full min-h-[200px]"
            onError={(msg) => setVideoEmbedError(msg)}
          />
          {videoEmbedError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20 p-6 text-center">
              <AlertCircle size={32} className="text-amber-400 mb-3" />
              <p className="text-white text-sm mb-4">{videoEmbedError}</p>
              <button
                type="button"
                onClick={() => { setVideoEmbedError(null); void loadRoom(); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                {translate(lang, "common.retry") || "Retry"}
              </button>
            </div>
          )}
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
                  <p className="text-xs font-semibold text-emerald-300 mb-2">{translate(lang, "hum.intake.sidebarTitle")}</p>
                  <HumanitarianIntakeSummary
                    summary={humanitarianIntake?.summary ?? null}
                    chiefComplaint={humanitarianIntake?.chiefComplaint}
                    compact
                    dark
                    lang={lang}
                  />
                </div>
              )}

              {!chartId && data.kind !== "humanitarian" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                  {t("noChart")}
                </div>
              )}

              {chartId && chartLinks && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2">{t("chartActions")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={chartLinks.addRecord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl transition"
                      >
                        <Plus size={14} /> {isPsychoanalyst || isIntegrative ? t("addSessionNote") : t("addRecord")}
                      </a>
                      {chartLinks.prescribe && (
                        <a
                          href={chartLinks.prescribe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl transition"
                        >
                          <Pill size={14} /> {t("prescribe")}
                        </a>
                      )}
                      {chartLinks.exam && (
                        <a
                          href={chartLinks.exam}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <FlaskConical size={13} /> {t("requestExam")}
                        </a>
                      )}
                      {chartLinks.document && (
                        <a
                          href={chartLinks.document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <ScrollText size={13} /> {t("issueDocument")}
                        </a>
                      )}
                      {chartLinks.psychSession && (
                        <a
                          href={chartLinks.psychSession}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-violet-200 bg-violet-900/50 hover:bg-violet-900/70 py-2 rounded-lg transition"
                        >
                          <FileText size={13} /> {t("psychSession")}
                        </a>
                      )}
                      {chartLinks.psychScale && (
                        <a
                          href={chartLinks.psychScale}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-violet-200 bg-violet-900/50 hover:bg-violet-900/70 py-2 rounded-lg transition"
                        >
                          <BarChart3 size={13} /> {t("psychScale")}
                        </a>
                      )}
                      {chartLinks.psychDocument && (
                        <a
                          href={chartLinks.psychDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-violet-200 bg-violet-900/50 hover:bg-violet-900/70 py-2 rounded-lg transition col-span-2"
                        >
                          <ScrollText size={13} /> {t("psychDocument")}
                        </a>
                      )}
                      {chartLinks.vaccines && (
                        <a
                          href={chartLinks.vaccines}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <Syringe size={13} /> {t("vaccines")}
                        </a>
                      )}
                      {chartLinks.dental && (
                        <a
                          href={chartLinks.dental}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <ClipboardList size={13} /> {t("dental")}
                        </a>
                      )}
                      {chartLinks.evolution && (
                        <a
                          href={chartLinks.evolution}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <Activity size={13} /> {t("evolution")}
                        </a>
                      )}
                      {chartLinks.diagnoses && (
                        <a
                          href={chartLinks.diagnoses}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg transition"
                        >
                          <Stethoscope size={13} /> {t("diagnoses")}
                        </a>
                      )}
                    </div>
                  </div>

                  <ConsultNotesAssistant
                    ref={notesAssistantRef}
                    lang={lang}
                    patientRecordId={isIntegrative || isPsychoanalyst ? null : chartId}
                    analysandRecordId={isPsychoanalyst ? chartId : null}
                    integrativeClientRecordId={isIntegrative ? chartId : null}
                    practiceSlug={isIntegrative ? integrativePracticeSlug : null}
                    appointmentId={data.appointmentId}
                    patientName={data.otherParty}
                    onSaved={() => {
                      if (chartId) loadRecords(chartId, data.providerPanel);
                    }}
                  />

                  {isIntegrative && chartId ? (
                    <IntegrativeConsultPanel
                      lang={lang}
                      clientId={chartId}
                      appointmentId={data.appointmentId}
                      dark
                      onPracticeChange={setIntegrativePracticeSlug}
                      onNoteSaved={() => loadRecords(chartId, data.providerPanel)}
                    />
                  ) : (
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
                  )}

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
                          <a
                            key={r.id}
                            href={chartLinks.recordUrl(r.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50 hover:border-emerald-500/40 hover:bg-slate-800 transition group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-slate-300 truncate">{r.title}</p>
                              <ExternalLink size={11} className="text-slate-600 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                            </div>
                            {r.content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.content}</p>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {chartId && chartLinks && (
              <div className="p-4 border-t border-slate-800 shrink-0">
                <a
                  href={chartLinks.fullChart}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg transition w-full"
                >
                  <FileText size={13} /> {isPsychoanalyst ? t("openAnalysand") : isIntegrative ? t("openChart") : t("openChart")}
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
