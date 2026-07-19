"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileCheck, Loader2, Lock, Shield } from "lucide-react";

type Lang = "pt" | "en" | "es";

const UI: Record<Lang, Record<string, string>> = {
  pt: {
    title: "Enviar resultados de exame",
    intro: "Seu médico pediu exames anteriores. Digite o PIN e anexe o arquivo (PDF ou foto).",
    from: "Pedido de",
    pin: "Código PIN",
    pinPlaceholder: "6 dígitos",
    unlock: "Continuar",
    titleLabel: "Título",
    titlePlaceholder: "Ex.: Hemograma 2024",
    notes: "Observações (opcional)",
    file: "Arquivo",
    submit: "Enviar exame",
    thanks: "Exame enviado com sucesso. O médico vai avaliar.",
    sendAnother: "Enviar outro arquivo",
    expired: "Este link expirou. Peça um novo link ao médico.",
    done: "Limite de envios atingido para este link.",
    error: "Não foi possível enviar. Verifique o PIN e tente novamente.",
    invalidPin: "PIN inválido. Confira o código que você recebeu.",
    privacy: "Seus arquivos são confidenciais e protegidos (LGPD).",
  },
  en: {
    title: "Upload exam results",
    intro: "Your doctor asked for prior exam results. Enter the PIN and attach a PDF or photo.",
    from: "Request from",
    pin: "PIN code",
    pinPlaceholder: "6 digits",
    unlock: "Continue",
    titleLabel: "Title",
    titlePlaceholder: "E.g. Bloodwork 2024",
    notes: "Notes (optional)",
    file: "File",
    submit: "Upload exam",
    thanks: "Exam uploaded successfully. Your doctor will review it.",
    sendAnother: "Upload another file",
    expired: "This link has expired. Ask your doctor for a new one.",
    done: "Upload limit reached for this link.",
    error: "Could not upload. Check the PIN and try again.",
    invalidPin: "Invalid PIN. Check the code you received.",
    privacy: "Your files are confidential and protected.",
  },
  es: {
    title: "Enviar resultados de examen",
    intro: "Su médico pidió exámenes anteriores. Ingrese el PIN y adjunte PDF o foto.",
    from: "Pedido de",
    pin: "Código PIN",
    pinPlaceholder: "6 dígitos",
    unlock: "Continuar",
    titleLabel: "Título",
    titlePlaceholder: "Ej.: Hemograma 2024",
    notes: "Notas (opcional)",
    file: "Archivo",
    submit: "Enviar examen",
    thanks: "Examen enviado con éxito. El médico lo revisará.",
    sendAnother: "Enviar otro archivo",
    expired: "Este enlace expiró. Pida uno nuevo al médico.",
    done: "Límite de envíos alcanzado para este enlace.",
    error: "No se pudo enviar. Verifique el PIN e intente de nuevo.",
    invalidPin: "PIN inválido. Revise el código que recibió.",
    privacy: "Sus archivos son confidenciales y están protegidos.",
  },
};

export default function PublicExamResultUploadPage() {
  const params = useParams();
  const token = params.token as string;
  const [lang, setLang] = useState<Lang>("pt");
  const t = (k: string) => UI[lang][k] || k;

  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"pin" | "form" | "thanks" | "expired" | "done">("pin");
  const [canSubmitMore, setCanSubmitMore] = useState(false);

  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "pt";
    if (nav.startsWith("es")) setLang("es");
    else if (nav.startsWith("en")) setLang("en");
    else setLang("pt");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/exam-results/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus(res.status === 410 ? "expired" : "expired");
          return;
        }
        setDoctorName(data.doctorName || "");
        setNote(data.note || "");
        if (!data.canSubmit) setStatus("done");
        else setStatus("pin");
      } catch {
        setStatus("expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim().length < 4) {
      setError(t("invalidPin"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/exam-results/${token}?pin=${encodeURIComponent(pin.trim())}`,
      );
      if (res.status === 401) {
        setError(t("invalidPin"));
        return;
      }
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setUnlocked(true);
      setStatus("form");
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("error"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("pin", pin.trim());
      form.set("title", title.trim());
      form.set("notes", notes.trim());
      form.set("file", file);
      const res = await fetch(`/api/public/exam-results/${token}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError(t("invalidPin"));
        setUnlocked(false);
        setStatus("pin");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("error"));
        return;
      }
      setCanSubmitMore(!!data.canSubmitMore);
      setStatus("thanks");
      setFile(null);
      setTitle("");
      setNotes("");
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-cyan-600" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-slate-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6 justify-center text-cyan-800">
          <FileCheck size={22} />
          <span className="font-bold text-lg">Doctor8</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
          {doctorName && (
            <p className="text-sm text-slate-500">
              {t("from")} <span className="font-semibold text-slate-700">Dr(a). {doctorName}</span>
            </p>
          )}

          {status === "expired" && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{t("expired")}</p>
          )}
          {status === "done" && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">{t("done")}</p>
          )}

          {status === "thanks" && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
              <p className="text-sm text-slate-700">{t("thanks")}</p>
              {canSubmitMore && (
                <button
                  type="button"
                  onClick={() => setStatus("form")}
                  className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  {t("sendAnother")}
                </button>
              )}
            </div>
          )}

          {status === "pin" && (
            <form onSubmit={handleUnlock} className="space-y-4">
              <p className="text-sm text-slate-600">{t("intro")}</p>
              {note && (
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2 whitespace-pre-wrap">{note}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pin")}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("pinPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-sm tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {t("unlock")}
              </button>
            </form>
          )}

          {status === "form" && unlocked && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("titleLabel")}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("file")}</label>
                <input
                  type="file"
                  accept=".pdf,image/*,video/mp4,video/quicktime,video/webm"
                  capture="environment"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:text-cyan-700 file:text-sm file:font-medium"
                />
                {file && (
                  <p className="text-xs text-slate-500 mt-1">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={saving || !file}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("submit")}
              </button>
            </form>
          )}

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2">
            <Shield size={12} /> {t("privacy")}
          </p>
        </div>
      </div>
    </div>
  );
}
