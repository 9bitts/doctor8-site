"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function AngelWellbeingPrompt() {
  const { t } = useI18n();
  const [due, setDue] = useState(false);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/humanitarian/angel/wellbeing");
        const data = await res.json();
        if (!cancelled && res.ok && data.due) {
          setDue(true);
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/humanitarian/angel/wellbeing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, note: note.trim() || undefined }),
      });
      if (res.ok) {
        setOpen(false);
        setDue(false);
      }
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  }

  if (!due || dismissed || !open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 border border-rose-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-slate-900">{t("angel.wellbeing.title")}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDismissed(true);
            }}
            className="text-slate-400 hover:text-slate-600"
            aria-label={t("angel.wellbeing.dismiss")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600">{t("angel.wellbeing.prompt")}</p>
        <div className="flex justify-between gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                score === n
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center">
          {score <= 2
            ? t("angel.wellbeing.scaleLow")
            : score >= 4
              ? t("angel.wellbeing.scaleHigh")
              : t("angel.wellbeing.scaleMid")}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("angel.wellbeing.noteOptional")}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin inline" />
          ) : (
            t("angel.wellbeing.submit")
          )}
        </button>
      </div>
    </div>
  );
}
