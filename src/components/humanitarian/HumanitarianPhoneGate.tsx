"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, MessageCircle } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import { humanitarianApiErrorMessage } from "@/lib/humanitarian/api-error-message";
import InternationalPhoneInput, {
  type InternationalPhoneValue,
} from "@/components/InternationalPhoneInput";
import { buildInternationalPhoneE164 } from "@/lib/international-phone";

type Props = {
  lang: Lang;
  campaignSlug: string;
  onReady: () => void;
  enabled?: boolean;
};

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

export default function HumanitarianPhoneGate({ lang, campaignSlug, onReady, enabled = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<InternationalPhoneValue>({ ddi: "58", nationalNumber: "" });

  useEffect(() => {
    if (!enabled) {
      onReady();
      setLoading(false);
      return;
    }
    fetch(`/api/humanitarian/intake/phone?campaignSlug=${campaignSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.phoneReady) {
          onReady();
          return;
        }
        if (d.parts) {
          setPhone({
            ddi: d.parts.ddi || "58",
            nationalNumber: `${d.parts.ddd || ""}${d.parts.number || ""}`,
          });
        }
      })
      .catch(() => setError(t(lang, "hum.phone.error")))
      .finally(() => setLoading(false));
  }, [campaignSlug, enabled, lang, onReady]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(t(lang, "hum.offline.submitBlocked"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/intake/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignSlug,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(humanitarianApiErrorMessage(lang, data));
        return;
      }
      onReady();
    } catch {
      setError(t(lang, "hum.phone.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <HumanitarianOfflineBanner lang={lang} />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <MessageCircle size={22} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t(lang, "hum.phone.title")}</h2>
          <p className="text-sm text-slate-600 mt-1">{t(lang, "hum.phone.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <InternationalPhoneInput
          lang={lang}
          value={phone}
          onChange={setPhone}
          region="VE"
        />

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !buildInternationalPhoneE164(phone.ddi, phone.nationalNumber)}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
          {t(lang, "hum.phone.save")}
        </button>
      </form>
    </div>
  );
}
