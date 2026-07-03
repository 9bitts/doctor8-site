"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Save } from "lucide-react";

interface PatientAdminReviewPanelProps {
  patientId: string;
  initialNote: string | null;
  initialReviewedAt: string | null;
  onSaved?: () => void;
}

export default function PatientAdminReviewPanel({
  patientId,
  initialNote,
  initialReviewedAt,
  onSaved,
}: PatientAdminReviewPanelProps) {
  const [note, setNote] = useState(initialNote ?? "");
  const [reviewed, setReviewed] = useState(Boolean(initialReviewedAt));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNote(initialNote ?? "");
    setReviewed(Boolean(initialReviewedAt));
  }, [initialNote, initialReviewedAt]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: note, reviewed }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved?.();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList size={18} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-slate-800">Conferùncia administrativa</h2>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase">Observaùùo</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Anotaùùes internas sobre este paciente..."
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none resize-y"
        />
      </label>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
          className="rounded border-slate-300 text-brand-500 focus:ring-brand-400"
        />
        <span className="text-sm text-slate-700 flex items-center gap-1.5">
          <CheckCircle2 size={16} className={reviewed ? "text-emerald-500" : "text-slate-300"} />
          Jù conferido
        </span>
      </label>

      {initialReviewedAt && reviewed && (
        <p className="text-xs text-slate-400">
          Conferido em {new Date(initialReviewedAt).toLocaleString("pt-BR")}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2 rounded-xl transition"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar
        </button>
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">Salvo com sucesso</span>
        )}
      </div>
    </section>
  );
}
