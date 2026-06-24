"use client";

import { useState } from "react";
import { Star, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ReviewPromptModal({
  providerId,
  providerType,
  providerName,
  onClose,
}: {
  providerId: string;
  providerType: "health" | "psychoanalyst";
  providerName?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setSaving(true);
    setMsg("");
    try {
      const body =
        providerType === "psychoanalyst"
          ? { psychoanalystId: providerId, providerType, rating, comment: comment.trim() || undefined }
          : { professionalId: providerId, providerType, rating, comment: comment.trim() || undefined };

      const res = await fetch("/api/patient/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pubReviews.submitErr"));
      setDone(true);
      setMsg(t("pubReviews.submitOk"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("pubReviews.submitErr"));
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-slate-900 pr-8">{t("pubReviews.modalTitle")}</h2>
        {providerName && (
          <p className="text-sm text-slate-500">{providerName}</p>
        )}

        <div className="flex gap-1 justify-center py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                size={28}
                className={n <= rating ? "text-amber-400" : "text-slate-200"}
                fill={n <= rating ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("pubReviews.commentPlaceholder")}
          rows={3}
          disabled={done}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />

        {msg && (
          <p className={`text-sm ${done ? "text-brand-600" : "text-rose-600"}`}>{msg}</p>
        )}

        {!done && (
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : t("pubReviews.submit")}
          </button>
        )}
      </div>
    </div>
  );
}
