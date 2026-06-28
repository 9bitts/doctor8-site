"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, MessageCircle } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";

type Props = {
  lang: Lang;
  campaignSlug: string;
  onReady: () => void;
};

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

export default function HumanitarianPhoneGate({ lang, campaignSlug, onReady }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ddi, setDdi] = useState("58");
  const [ddd, setDdd] = useState("");
  const [number, setNumber] = useState("");

  useEffect(() => {
    fetch(`/api/humanitarian/intake/phone?campaignSlug=${campaignSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.phoneReady) {
          onReady();
          return;
        }
        if (d.parts) {
          setDdi(d.parts.ddi || "58");
          setDdd(d.parts.ddd || "");
          setNumber(d.parts.number || "");
        }
      })
      .catch(() => setError(t(lang, "hum.phone.error")))
      .finally(() => setLoading(false));
  }, [campaignSlug, lang, onReady]);

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
        body: JSON.stringify({ campaignSlug, ddi, ddd, number }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INVALID_PHONE"
            ? t(lang, "hum.phone.invalid")
            : t(lang, "hum.phone.error"),
        );
        return;
      }
      onReady();
    } catch {
      setError(t(lang, "hum.phone.error"));
    } finally {
      setSaving(false);
    }
  }

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
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">{t(lang, "hum.phone.ddi")}</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={ddi}
              onChange={(e) => setDdi(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="58"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t(lang, "hum.phone.ddd")}</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={ddd}
              onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="412"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-600">{t(lang, "hum.phone.number")}</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 15))}
              placeholder="1234567"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
          {t(lang, "hum.phone.save")}
        </button>
      </form>
    </div>
  );
}
