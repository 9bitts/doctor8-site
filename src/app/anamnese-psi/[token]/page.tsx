"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Shield } from "lucide-react";
import { PSYCHOLOGY_ANAMNESIS_FIELDS } from "@/lib/psychology-anamnesis";

type Lang = "pt" | "en" | "es";

const UI: Record<Lang, Record<string, string>> = {
  pt: {
    title: "Anamnese psicológica",
    intro: "Preencha o formulário abaixo. Suas informações são confidenciais e protegidas (LGPD).",
    submit: "Enviar anamnese",
    thanks: "Anamnese enviada com sucesso. Obrigado!",
    expired: "Este link expirou. Peça um novo link à sua psicóloga(o).",
    done: "Este formulário já foi preenchido.",
    error: "Não foi possível enviar. Tente novamente.",
  },
  en: {
    title: "Psychological intake form",
    intro: "Please complete the form below. Your information is confidential and protected.",
    submit: "Submit intake",
    thanks: "Intake submitted successfully. Thank you!",
    expired: "This link has expired. Please request a new one from your psychologist.",
    done: "This form has already been submitted.",
    error: "Could not submit. Please try again.",
  },
  es: {
    title: "Anamnesis psicológica",
    intro: "Complete el formulario. Su información es confidencial y está protegida.",
    submit: "Enviar anamnesis",
    thanks: "¡Anamnesis enviada con éxito!",
    expired: "Este enlace expiró. Solicite uno nuevo a su psicólogo/a.",
    done: "Este formulario ya fue enviado.",
    error: "No se pudo enviar. Intente de nuevo.",
  },
};

export default function PublicAnamnesisPage() {
  const params = useParams();
  const token = params.token as string;
  const [lang, setLang] = useState<Lang>("pt");
  const t = (k: string) => UI[lang][k] || k;

  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);
  const [psychologistName, setPsychologistName] = useState("");
  const [status, setStatus] = useState<"form" | "thanks" | "expired" | "done">("form");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/psychology/anamnesis/${token}`);
        const data = await res.json();
        if (!res.ok) { setStatus("expired"); return; }
        setPsychologistName(data.psychologistName || "");
        if (data.status === "COMPLETED") setStatus("done");
        else if (data.status === "EXPIRED") setStatus("expired");
        else setCanSubmit(!!data.canSubmit);
      } catch { setStatus("expired"); }
      setLoading(false);
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/public/psychology/anamnesis/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) setStatus("thanks");
    } finally { setSaving(false); }
  }

  function label(f: (typeof PSYCHOLOGY_ANAMNESIS_FIELDS)[0]) {
    if (lang === "en") return f.labelEn;
    if (lang === "es") return f.labelEs;
    return f.labelPt;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-end gap-2 mb-4">
          {(["pt", "en", "es"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`text-xs font-medium px-2 py-1 rounded ${lang === l ? "bg-violet-600 text-white" : "text-slate-500"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 text-violet-700 mb-2">
            <Shield size={20} />
            <span className="text-xs font-semibold uppercase tracking-wide">Doctor8</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          {psychologistName && (
            <p className="text-sm text-slate-500 mt-1">{psychologistName}</p>
          )}

          {status === "thanks" && (
            <div className="mt-8 flex flex-col items-center gap-3 text-center text-emerald-700">
              <CheckCircle2 size={48} />
              <p className="font-medium">{t("thanks")}</p>
            </div>
          )}
          {(status === "expired" || status === "done") && (
            <p className="mt-6 text-amber-800 bg-amber-50 rounded-xl p-4 text-sm">
              {status === "done" ? t("done") : t("expired")}
            </p>
          )}

          {status === "form" && canSubmit && (
            <>
              <p className="text-sm text-slate-600 mt-4">{t("intro")}</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {PSYCHOLOGY_ANAMNESIS_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="text-sm font-semibold text-slate-700">
                      {label(f)}{f.required ? " *" : ""}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        required={f.required}
                        value={fields[f.key] || ""}
                        onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholderPt}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    ) : (
                      <input
                        required={f.required}
                        value={fields[f.key] || ""}
                        onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    )}
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {t("submit")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
