"use client";

// Prompts patient to fill and/or share medical history with the care professional.

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Share2, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

interface ShareHistoryPromptProps {
  professionalUserId?: string;
  professionalId?: string;
  professionalName: string;
  className?: string;
}

export default function ShareHistoryPrompt({
  professionalUserId,
  professionalId,
  professionalName,
  className = "",
}: ShareHistoryPromptProps) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [historyFilled, setHistoryFilled] = useState(false);
  const [alreadyShared, setAlreadyShared] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [error, setError] = useState("");
  const [resolvedProUserId, setResolvedProUserId] = useState<string | null>(professionalUserId ?? null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (professionalUserId) params.set("professionalUserId", professionalUserId);
        else if (professionalId) params.set("professionalId", professionalId);
        const res = await fetch(`/api/patient/history-status?${params}`);
        const data = await res.json();
        if (!active) return;
        setHistoryFilled(!!data.historyFilled);
        setAlreadyShared(!!data.alreadyShared);
        if (data.professionalUserId) setResolvedProUserId(data.professionalUserId);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [professionalUserId, professionalId]);

  async function shareHistory() {
    if (!resolvedProUserId) return;
    setSharing(true);
    setError("");
    try {
      const res = await fetch("/api/patient/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "history", professionalUserId: resolvedProUserId }),
      });
      if (!res.ok) {
        setError(t("shareHist.err"));
        return;
      }
      setJustShared(true);
      setAlreadyShared(true);
    } catch {
      setError(t("shareHist.err"));
    }
    setSharing(false);
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}>
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  if (alreadyShared || justShared) {
    return (
      <div className={`bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 ${className}`}>
        <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">{t("shareHist.doneTitle")}</p>
          <p className="text-xs text-emerald-700 mt-1">{t("shareHist.doneText").replace("{{name}}", professionalName)}</p>
        </div>
      </div>
    );
  }

  if (!historyFilled) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{t("shareHist.fillTitle")}</p>
            <p className="text-xs text-amber-800 mt-1">
              {t("shareHist.fillText").replace("{{name}}", professionalName)}
            </p>
          </div>
        </div>
        <Link
          href="/patient/history"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl transition"
        >
          <FileText size={16} /> {t("shareHist.fillAction")}
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        <Share2 size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">{t("shareHist.shareTitle")}</p>
          <p className="text-xs text-blue-800 mt-1">
            {t("shareHist.shareText").replace("{{name}}", professionalName)}
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={shareHistory}
        disabled={sharing || !resolvedProUserId}
        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 rounded-xl transition"
      >
        {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
        {sharing ? t("shareHist.sharing") : t("shareHist.shareAction")}
      </button>
    </div>
  );
}
