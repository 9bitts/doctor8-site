"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";

export default function SlotAlertForm({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/public/professionals/${slug}/slot-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pub.errGeneric"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pub.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-xl p-3">
        <CheckCircle2 size={16} />
        {t("pubPhase3.alertSuccess")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-t border-slate-100 pt-4 space-y-2">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Bell size={13} /> {t("pubPhase3.alertPrompt")}
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("pubPhase3.alertEmail")}
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 bg-brand-50 text-brand-600 font-semibold text-xs px-3 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : t("pubPhase3.alertCta")}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </form>
  );
}
