"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { COPSOQ_LITE_OPTIONS } from "@/lib/nr1-copsoq-lite";

type Question = { id: string; dimension: string; textPt: string };

export default function PublicSurveyPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [privacyNotice, setPrivacyNotice] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [department, setDepartment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/employer/survey?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTitle(data.title);
          setCompanyName(data.companyName);
          setQuestions(data.questions ?? []);
          setPrivacyNotice(data.privacyNotice ?? "");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar pesquisa");
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/public/employer/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers, department }),
    });
    if (res.ok) setSubmitted(true);
    else setError("Não foi possível enviar");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-sky-50">
        <div className="max-w-md text-center">
          <Shield className="mx-auto text-sky-600 mb-4" size={40} />
          <h1 className="text-xl font-bold text-slate-900">Obrigado pela participação</h1>
          <p className="text-slate-600 mt-2 text-sm">Suas respostas foram registradas de forma anônima.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <p className="text-sm text-sky-700 font-medium">{companyName}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{title}</h1>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">{privacyNotice}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Setor (opcional, para agregação anônima)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          />

          {questions.map((q) => (
            <fieldset key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <legend className="text-sm font-medium text-slate-800 px-1">{q.textPt}</legend>
              <p className="text-xs text-slate-400 mb-3">{q.dimension}</p>
              <div className="space-y-2">
                {COPSOQ_LITE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name={q.id}
                      required
                      value={opt.value}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <button type="submit" className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold">
            Enviar respostas anônimas
          </button>
        </form>
      </div>
    </div>
  );
}
