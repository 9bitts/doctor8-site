"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Zap, Calendar, X } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import {
  PATIENT_HUMANITARIAN_ENTRY,
  PATIENT_SCHEDULED_VOLUNTEER_ENTRY,
} from "@/lib/platform-nav-registry";

const DISMISS_PREFIX = "doctor8:vePatientGuide:v2:dismissed";

const VE_YELLOW = "#ffcc00";
const VE_BLUE = "#00308f";
const VE_RED = "#cf142b";

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
        const res = await fetch("/api/patient/venezuela-operation");
        const data = res.ok ? await res.json() : { active: false };

        if (!cancelled) {
          setShow(data.active === true);
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
      className="border-b shadow-sm"
      style={{ borderColor: `${VE_BLUE}33`, backgroundColor: "#ffffff" }}
      role="region"
      aria-label={t("veGuide.eyebrow")}
    >
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(to right, ${VE_YELLOW}, ${VE_BLUE}, ${VE_RED})`,
        }}
        aria-hidden
      />

      <div className="px-4 lg:px-8 py-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: "#fff8e1", border: `2px solid ${VE_BLUE}` }}
          >
            <Heart size={22} style={{ color: VE_RED }} fill={VE_RED} fillOpacity={0.2} />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: VE_BLUE }}
            >
              {t("veGuide.eyebrow")}
            </p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 leading-snug">
              {t("veGuide.question")}
            </p>

            <div className="mt-3 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <Link
                href={PATIENT_HUMANITARIAN_ENTRY.href}
                className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-md transition hover:brightness-95 active:scale-[0.98]"
                style={{ backgroundColor: VE_RED, color: "#ffffff" }}
              >
                <Zap size={18} strokeWidth={2.5} className="shrink-0" />
                <span className="leading-tight">
                  <span className="block font-bold">{t("veGuide.now")}</span>
                  <span className="block text-xs font-normal opacity-95">{t("veGuide.nowSub")}</span>
                </span>
              </Link>

              <Link
                href={PATIENT_SCHEDULED_VOLUNTEER_ENTRY.href}
                className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-md transition hover:brightness-95 active:scale-[0.98]"
                style={{ backgroundColor: VE_BLUE, color: "#ffffff" }}
              >
                <Calendar size={18} strokeWidth={2.5} className="shrink-0" />
                <span className="leading-tight">
                  <span className="block font-bold">{t("veGuide.schedule")}</span>
                  <span className="block text-xs font-normal opacity-95">{t("veGuide.scheduleSub")}</span>
                </span>
              </Link>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2 transition"
            >
              {t("veGuide.dismiss")}
            </button>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg transition shrink-0 -mr-1 hover:bg-slate-100"
            style={{ color: VE_BLUE }}
            aria-label={t("veGuide.dismiss")}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
