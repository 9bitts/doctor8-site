"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ACURA_VOLUNTEER_TERMS_URL } from "@/lib/acura-volunteer";
import AcuraVolunteerBadge from "./AcuraVolunteerBadge";

type Props = {
  initialChecked: boolean;
  verified: boolean;
};

export default function AcuraVolunteerOptIn({ initialChecked, verified }: Props) {
  const { t } = useI18n();
  const [checked, setChecked] = useState(initialChecked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle(next: boolean) {
    if (!verified) return;
    setSaving(true);
    setError("");
    const prev = checked;
    setChecked(next);
    try {
      const res = await fetch("/api/provider/acura-volunteer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acuraVolunteer: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChecked(prev);
        setError(
          data.error === "verified_required"
            ? t("acura.vol.optIn.verifiedRequired")
            : t("acura.vol.optIn.error")
        );
      }
    } catch {
      setChecked(prev);
      setError(t("acura.vol.optIn.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("acura.vol.optIn.title")}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">{t("acura.vol.optIn.hint")}</p>
        </div>
        {checked && verified && <AcuraVolunteerBadge size="md" />}
      </div>

      <label className={`flex items-start gap-3 ${verified ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={!verified || saving}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/40"
        />
        <span className="text-sm text-slate-700">
          {t("acura.vol.optIn.label")}
          {saving && <Loader2 size={14} className="inline ml-2 animate-spin text-sky-500" />}
        </span>
      </label>

      {!verified && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {t("acura.vol.optIn.verifiedRequired")}
        </p>
      )}

      <p className="text-xs text-slate-500">
        <Link
          href={ACURA_VOLUNTEER_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-700 font-medium hover:underline"
        >
          {t("acura.vol.optIn.terms")}
        </Link>
      </p>

      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
