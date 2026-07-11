"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Zap, Calendar, X } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  PATIENT_HUMANITARIAN_ENTRY,
  PATIENT_SCHEDULED_VOLUNTEER_ENTRY,
} from "@/lib/platform-nav-registry";

const DISMISS_PREFIX = "doctor8:vePatientGuide:dismissed";

type Props = {
  userId: string;
  lang: Lang;
};

export default function VenezuelaPatientGuideBanner({ userId, lang }: Props) {
  const t = (key: string) => translate(lang, key);
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveVisibility() {
      try {
        if (localStorage.getItem(`${DISMISS_PREFIX}:${userId}`) === "1") {
          if (!cancelled) {
            setShow(false);
            setReady(true);
          }
          return;
        }
      } catch {
        /* ignore */
      }

      try {
        const [regionRes, campaignRes] = await Promise.all([
          fetch("/api/user/region"),
          fetch(`/api/humanitarian/campaigns/${VENEZUELA_CAMPAIGN_SLUG}`),
        ]);

        const region = regionRes.ok ? (await regionRes.json()).region : null;
        const campaignActive = campaignRes.ok
          ? (await campaignRes.json()).campaign?.active === true
          : false;

        if (!cancelled) {
          setShow(region === "VE" || campaignActive);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setShow(false);
          setReady(true);
        }
      }
    }

    void resolveVisibility();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!ready || !show) return null;

  function dismiss() {
    try {
      localStorage.setItem(`${DISMISS_PREFIX}:${userId}`, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div
      className="border-b border-[#00308f]/20 shadow-sm"
      role="region"
      aria-label={t("veGuide.eyebrow")}
    >
      <div className="h-1 bg-gradient-to-r from-[#ffcc00] via-[#00308f] to-[#cf142b]" aria-hidden />

      <div className="bg-gradient-to-br from-[#fffbeb] via-[#eff6ff] to-[#fff1f2] px-4 lg:px-8 py-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-white border-2 border-[#00308f]/30 flex items-center justify-center shrink-0 shadow-sm">
            <Heart size={22} className="text-[#cf142b]" fill="#cf142b" fillOpacity={0.15} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#00308f]">
              {t("veGuide.eyebrow")}
            </p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 leading-snug">
              {t("veGuide.question")}
            </p>

            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Link
                href={PATIENT_HUMANITARIAN_ENTRY.href}
                className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] bg-gradient-to-r from-[#cf142b] to-[#b91c1c]"
              >
                <Zap size={16} strokeWidth={2.5} className="shrink-0" />
                <span>
                  {t("veGuide.now")}
                  <span className="font-normal opacity-90"> {t("veGuide.nowSub")}</span>
                </span>
              </Link>

              <Link
                href={PATIENT_SCHEDULED_VOLUNTEER_ENTRY.href}
                className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] bg-gradient-to-r from-[#00308f] to-[#001d66]"
              >
                <Calendar size={16} strokeWidth={2.5} className="shrink-0" />
                <span>
                  {t("veGuide.schedule")}
                  <span className="font-normal opacity-90"> {t("veGuide.scheduleSub")}</span>
                </span>
              </Link>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2 transition"
            >
              {t("veGuide.dismiss")}
            </button>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-[#00308f]/70 hover:text-[#00308f] hover:bg-white/60 transition shrink-0 -mr-1"
            aria-label={t("veGuide.dismiss")}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
