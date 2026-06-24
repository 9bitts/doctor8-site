"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { Calendar, ChevronRight, Loader2 } from "lucide-react";
import type { PublicProfileData } from "@/lib/public-profile";
import type { PublicAnalyticsSource } from "@/lib/public-analytics";
import SlotAlertForm from "@/components/public/SlotAlertForm";
import { trackPublicBookClick } from "@/components/public/PublicProfileTracker";

type DaySlots = {
  date: string;
  label: string;
  slots: { time: string; datetime: string; available: boolean }[];
};

function fmtPrice(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "BRL",
    }).format(cents / 100);
  } catch {
    return `R$ ${(cents / 100).toFixed(2)}`;
  }
}

export default function PublicBookingPanel({
  profile,
  embed = false,
  analyticsSource = "public_profile",
  bookingFrom = "public_profile",
}: {
  profile: PublicProfileData;
  embed?: boolean;
  analyticsSource?: PublicAnalyticsSource;
  bookingFrom?: "public_profile" | "public_search" | "public_embed";
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [days, setDays] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/public/professionals/${profile.slug}/slots?lang=${lang}`
        );
        if (res.ok) {
          const data = await res.json();
          setDays(data.days || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [profile.slug, lang]);

  const activeDay = days[selectedDay];
  const availableSlots = activeDay?.slots.filter((s) => s.available) ?? [];

  const nextAvailable = days
    .flatMap((d) => d.slots.filter((s) => s.available).map((s) => ({ ...s, dayLabel: d.label, date: d.date })))
    [0];

  const bookParams = new URLSearchParams({
    pro: profile.providerId,
    providerType: profile.providerType,
    from: bookingFrom,
    ...(selectedSlot ? { slot: selectedSlot } : {}),
  });
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/patient/appointments?${bookParams.toString()}`)}`;
  const registerUrl = `/register?callbackUrl=${encodeURIComponent(`/patient/appointments?${bookParams.toString()}`)}`;

  const shellClass = embed
    ? "space-y-3"
    : "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between">
        <h2 className={`font-semibold text-slate-800 ${embed ? "text-sm" : ""}`}>
          {t("pub.bookTitle")}
        </h2>
        <p className={`font-bold text-brand-600 ${embed ? "text-sm" : "text-sm"}`}>
          {fmtPrice(profile.consultPrice, profile.currency, locale)}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> {t("pub.loadingSlots")}
        </div>
      ) : days.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">{t("pub.noSlots")}</p>
          {nextAvailable && (
            <p className="text-xs text-slate-400 mt-2">
              {t("pub.nextAvailable")}: {nextAvailable.dayLabel} {nextAvailable.time}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {days.map((day, i) => (
              <button
                key={day.date}
                type="button"
                onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  i === selectedDay
                    ? "bg-brand-500 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-brand-50"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {availableSlots.length === 0 ? (
              <span className="text-sm text-slate-400">?</span>
            ) : (
              availableSlots.map((slot) => (
                <button
                  key={slot.datetime}
                  type="button"
                  onClick={() => setSelectedSlot(slot.datetime)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedSlot === slot.datetime
                      ? "bg-brand-500 text-white"
                      : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                  }`}
                >
                  {slot.time}
                </button>
              ))
            )}
          </div>
        </>
      )}

      <Link
        href={loginUrl}
        target={embed ? "_top" : undefined}
        onClick={() => trackPublicBookClick(profile.slug, analyticsSource)}
        className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3 rounded-xl transition text-sm"
      >
        <Calendar size={18} />
        {selectedSlot ? t("pub.bookSlot") : t("pub.bookCta")}
        <ChevronRight size={16} />
      </Link>

      <p className="text-center text-xs text-slate-400">
        {t("pub.noAccount")}{" "}
        <Link
          href={registerUrl}
          target={embed ? "_top" : undefined}
          className="text-brand-500 font-semibold hover:underline"
        >
          {t("pub.register")}
        </Link>
      </p>

      {!embed && <SlotAlertForm slug={profile.slug} />}
    </div>
  );
}
