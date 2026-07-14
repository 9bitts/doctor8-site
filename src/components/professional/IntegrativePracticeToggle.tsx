"use client";

import { useEffect, useState } from "react";
import { Loader2, Sprout } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { usePathname } from "next/navigation";

export default function IntegrativePracticeToggle() {
  const { t } = useI18n();
  const pathname = usePathname();
  const isPsychologist = pathname.startsWith("/psychologist");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isPsychologist) {
      setLoading(false);
      return;
    }
    fetch("/api/professional/profile")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(!!d.profile?.practicesIntegrativeMedicine);
      })
      .finally(() => setLoading(false));
  }, [isPsychologist]);

  if (isPsychologist || loading) return null;

  async function toggle(next: boolean) {
    setSaving(true);
    setEnabled(next);
    try {
      await fetch("/api/professional/profile/integrative", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practicesIntegrativeMedicine: next }),
      });
    } catch {
      setEnabled(!next);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Sprout size={20} className="text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-800">{t("settings.integrative.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("settings.integrative.subtitle")}</p>
        </div>
        <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
          {saving && <Loader2 size={14} className="animate-spin text-slate-400" />}
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(e) => void toggle(e.target.checked)}
            className="w-5 h-5 accent-emerald-600"
          />
        </label>
      </div>
    </div>
  );
}
