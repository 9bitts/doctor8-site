"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, type Lang } from "@/lib/i18n/translations";

export default function HumanitarianAngelOptOutCard({ lang }: { lang: Lang }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/humanitarian/patient/angel-optout?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}`,
        );
        const data = await res.json();
        if (!cancelled && res.ok) setHasConsent(Boolean(data.hasConsent));
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !hasConsent) return null;

  return (
    <Link
      href="/humanitarian/angel-optout"
      className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 hover:bg-rose-100 transition"
    >
      <Heart className="w-5 h-5 text-rose-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-900">
          {translate(lang, "patient.angelOptOut.cardTitle")}
        </p>
        <p className="text-xs text-rose-700 mt-0.5">
          {translate(lang, "patient.angelOptOut.cardDesc")}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-rose-400 shrink-0" />
    </Link>
  );
}
