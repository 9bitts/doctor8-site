"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { patientSlotButtonClass, dayHasVolunteerSlots } from "@/lib/appointment-slots";
import { Calendar, ChevronRight, Loader2 } from "lucide-react";
import type { PublicProfileData } from "@/lib/public-profile";
import type { PublicAnalyticsSource } from "@/lib/public-analytics";
import SlotAlertForm from "@/components/public/SlotAlertForm";
import MagicLinkBookForm from "@/components/public/MagicLinkBookForm";
import { trackPublicBookClick } from "@/components/public/PublicProfileTracker";

type DaySlots = {
  date: string;
  label: string;
  slots: { time: string; datetime: string; available: boolean; volunteerOnly?: boolean }[];
};

const SERVICE_EVENT = "doctor8:select-service";

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

function readUrlParams() {
  if (typeof window === "undefined") {
    return { slot: null as string | null, service: null as string | null, volunteer: false };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    slot: params.get("slot"),
    service: params.get("service"),
    volunteer: params.get("volunteer") === "1",
  };
}

function applySlotPreselect(
  days: DaySlots[],
  preselectSlot: string | null
): { dayIndex: number; slot: string | null } {
  if (!preselectSlot || days.length === 0) return { dayIndex: 0, slot: null };
  const dayIndex = days.findIndex((day) =>
    day.slots.some((s) => s.datetime === preselectSlot && s.available)
  );
  if (dayIndex < 0) return { dayIndex: 0, slot: null };
  const available = days[dayIndex].slots.some(
    (s) => s.datetime === preselectSlot && s.available
  );
  return { dayIndex, slot: available ? preselectSlot : null };
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [volunteerMode, setVolunteerMode] = useState(false);

  const activeServices = profile.services.filter((s) => s.isActive);

  const resolveServiceId = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return activeServices.some((s) => s.id === id) ? id : null;
    },
    [activeServices]
  );

  useEffect(() => {
    const { service } = readUrlParams();
    const resolved = resolveServiceId(service);
    if (resolved) {
      setSelectedServiceId(resolved);
    } else if (activeServices.length === 1) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [resolveServiceId, activeServices]);

  useEffect(() => {
    function onServiceSelect(e: Event) {
      const id = (e as CustomEvent<{ serviceId: string }>).detail?.serviceId;
      if (id) setSelectedServiceId(resolveServiceId(id));
    }
    window.addEventListener(SERVICE_EVENT, onServiceSelect);
    return () => window.removeEventListener(SERVICE_EVENT, onServiceSelect);
  }, [resolveServiceId]);

  useEffect(() => {
    const { volunteer } = readUrlParams();
    setVolunteerMode(volunteer);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const volunteerQuery = volunteerMode ? "&volunteer=1" : "";
        const res = await fetch(
          `/api/public/professionals/${profile.slug}/slots?lang=${lang}${volunteerQuery}`
        );
        if (res.ok) {
          const data = await res.json();
          const loadedDays: DaySlots[] = data.days || [];
          setDays(loadedDays);
          const { slot } = readUrlParams();
          const { dayIndex, slot: picked } = applySlotPreselect(loadedDays, slot);
          setSelectedDay(dayIndex);
          setSelectedSlot(picked);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [profile.slug, lang, volunteerMode]);

  const activeDay = days[selectedDay];
  const availableSlots = activeDay?.slots.filter((s) => s.available) ?? [];

  const nextAvailable = days
    .flatMap((d) => d.slots.filter((s) => s.available).map((s) => ({ ...s, dayLabel: d.label, date: d.date })))
    [0];

  const selectedService = activeServices.find((s) => s.id === selectedServiceId) ?? null;
  const displayPriceCents = selectedService?.priceCents ?? profile.consultPrice;
  const displayCurrency = selectedService?.currency || profile.currency;
  const displayPriceLabel =
    selectedService?.priceCents === 0
      ? t("consultServices.volunteerPrice")
      : fmtPrice(displayPriceCents, displayCurrency, locale);

  const bookBasePath = volunteerMode ? "/patient/volunteer-appointments" : "/patient/appointments";
  const bookParams = new URLSearchParams({
    pro: profile.providerId,
    providerType: profile.providerType,
    from: bookingFrom,
    ...(selectedSlot ? { slot: selectedSlot } : {}),
    ...(selectedServiceId && !volunteerMode ? { service: selectedServiceId } : {}),
  });
  const bookCallback = `${bookBasePath}?${bookParams.toString()}`;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(bookCallback)}`;
  const registerUrl = `/register?callbackUrl=${encodeURIComponent(bookCallback)}`;

  const shellClass = embed
    ? "space-y-3"
    : "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4";

  return (
    <div id="public-booking" className={shellClass}>
      <div className="flex items-center justify-between">
        <h2 className={`font-semibold text-slate-800 ${embed ? "text-sm" : ""}`}>
          {t("pub.bookTitle")}
        </h2>
        <p className={`font-bold text-brand-600 ${embed ? "text-sm" : "text-sm"}`}>
          {volunteerMode ? t("consultServices.volunteerPrice") : displayPriceLabel}
        </p>
      </div>

      {activeServices.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            {t("pub.selectService")}
          </label>
          <select
            value={selectedServiceId ?? ""}
            onChange={(e) => setSelectedServiceId(e.target.value || null)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            required={activeServices.length > 1}
          >
            {activeServices.length > 1 && (
              <option value="" disabled>
                {t("pub.selectServiceRequired")}
              </option>
            )}
            {activeServices.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
                {svc.priceCents != null
                  ? svc.priceCents === 0
                    ? ` — ${t("consultServices.volunteerPrice")}`
                    : ` — ${fmtPrice(svc.priceCents, svc.currency || profile.currency, locale)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

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

          {dayHasVolunteerSlots(days) && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {t("appt.volunteerSlotLegend")}
            </p>
          )}

          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {availableSlots.length === 0 ? (
              <span className="text-sm text-slate-400">—</span>
            ) : (
              availableSlots.map((slot) => (
                <button
                  key={slot.datetime}
                  type="button"
                  onClick={() => setSelectedSlot(slot.datetime)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition ${patientSlotButtonClass(slot, selectedSlot === slot.datetime)}`}
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

      <MagicLinkBookForm callbackUrl={bookCallback} />

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

export { SERVICE_EVENT };
