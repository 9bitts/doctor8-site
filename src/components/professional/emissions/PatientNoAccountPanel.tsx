"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Chart } from "./types";

export function PatientNoAccountPanel({ patient }: { patient: Chart }) {
  const { t, lang } = useI18n();
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<"sent" | "error" | null>(null);

  useEffect(() => {
    setFeedback(null);
  }, [patient.id]);

  if (patient.hasAccount) return null;

  async function sendInvite() {
    if (!patient.email) return;
    setInviting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/professional/records/${patient.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      setFeedback(res.ok ? "sent" : "error");
    } catch {
      setFeedback("error");
    }
    setInviting(false);
  }

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 space-y-2">
      <p className="text-xs text-amber-900 leading-snug">{t("rx2.noAccountHint")}</p>
      {patient.email ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={sendInvite}
            disabled={inviting}
            className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition"
          >
            {inviting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {t("pat.sendInvite")}
          </button>
          {feedback === "sent" && (
            <span className="text-xs text-brand-600 inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> {t("pat.inviteSent")}
            </span>
          )}
          {feedback === "error" && (
            <span className="text-xs text-rose-600">{t("pat.inviteError")}</span>
          )}
        </div>
      ) : (
        <Link
          href={`/professional/patients/${patient.id}`}
          className="text-xs font-medium text-brand-600 hover:underline inline-block"
        >
          {t("pat.openChartToAddEmail")} ?
        </Link>
      )}
    </div>
  );
}
