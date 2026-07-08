"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

const MOODS = [
  { score: 1, emoji: "😔", label: "Muito mal" },
  { score: 2, emoji: "😕", label: "Mal" },
  { score: 3, emoji: "😐", label: "Neutro" },
  { score: 4, emoji: "🙂", label: "Bem" },
  { score: 5, emoji: "😊", label: "Muito bem" },
];

export default function WellnessPulseCard({ companySlug }: { companySlug?: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(score: number) {
    setSelected(score);
    setSaving(true);
    const res = await fetch("/api/public/employer/wellness-pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companySlug,
        moodScore: score,
        moodReason: reason.trim() || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        Obrigado! Seu check-in foi registrado de forma anônima e ajuda o RH a cuidar do bem-estar da equipe.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="text-violet-600" size={18} />
        <h2 className="font-semibold text-slate-900 text-sm">Como você está se sentindo hoje?</h2>
      </div>
      <p className="text-xs text-slate-500">
        Check-in anônimo de bem-estar (como no IBC de mercado). Opcional — não substitui atendimento clínico.
      </p>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.score}
            type="button"
            disabled={saving}
            onClick={() => submit(m.score)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs transition ${
              selected === m.score
                ? "border-violet-400 bg-white shadow-sm"
                : "border-violet-100 bg-white/80 hover:border-violet-300"
            }`}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className="text-slate-600">{m.label}</span>
          </button>
        ))}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional, anônimo)"
        className="w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm"
        maxLength={200}
      />
    </div>
  );
}
