"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { ContentAudioPlayer } from "@/components/employer/ContentAudioPlayer";

type ContentItem = {
  id: string;
  title: string;
  summary: string;
  durationMins: number;
  format: string;
  completed?: boolean;
  audioUrl?: string | null;
  transcript?: string | null;
  durationSecs?: number | null;
  progressSecs?: number;
};

const FORMAT_LABEL: Record<string, string> = {
  text: "Leitura",
  audio: "Áudio",
  exercise: "Exercício",
};

export default function PsychoedTrailsCard() {
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<ContentItem[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/workforce/content");
    if (res.ok) {
      const data = await res.json();
      setRecommended(data.recommended ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markComplete(contentId: string) {
    setMarking(contentId);
    await fetch("/api/workforce/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    setMarking(null);
    await load();
  }

  async function reportProgress(contentId: string, secs: number, completed: boolean) {
    await fetch("/api/workforce/content/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, progressSecs: secs, completed }),
    });
    if (completed) await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-sky-500" size={24} />
      </div>
    );
  }

  if (recommended.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="text-sky-600" size={18} />
        <h2 className="font-semibold text-slate-900 text-sm">Trilhas de bem-estar</h2>
      </div>
      <p className="text-xs text-slate-500">
        Conteúdos psicoeducativos recomendados com base no contexto organizacional da sua empresa (não substituem terapia).
      </p>
      <ul className="space-y-3">
        {recommended.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-100 p-4 text-sm">
            <div className="flex justify-between gap-2 items-start">
              <div className="flex-1">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-slate-600 mt-1 text-xs leading-relaxed">{item.summary}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {FORMAT_LABEL[item.format] ?? item.format} · {item.durationMins} min
                </p>
                {item.format === "audio" && (
                  <div className="mt-3">
                    <ContentAudioPlayer
                      contentId={item.id}
                      audioUrl={item.audioUrl}
                      transcript={item.transcript}
                      durationSecs={item.durationSecs}
                      completed={item.completed}
                      onProgress={(secs, done) => reportProgress(item.id, secs, done)}
                    />
                  </div>
                )}
              </div>
              {item.completed ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 shrink-0">
                  <CheckCircle2 size={14} /> Feito
                </span>
              ) : (
                <button
                  type="button"
                  disabled={marking === item.id}
                  onClick={() => markComplete(item.id)}
                  className="text-xs text-sky-600 hover:underline shrink-0 disabled:opacity-50"
                >
                  {marking === item.id ? "…" : "Concluir"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
