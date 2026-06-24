"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";
import {
  Star, CheckCircle2, Video, Building2, ChevronRight, MapPin, Clock,
} from "lucide-react";
import type { PublicSearchResult } from "@/lib/public-search";
import { cityToSeoSlug } from "@/lib/public-slugs";

function StarRating({ avg, count }: { avg: number | null; count: number }) {
  if (!avg || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      <Star size={13} fill="currentColor" />
      <span className="text-xs font-semibold text-slate-700">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-slate-400">({count})</span>
    </span>
  );
}

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

export default function PublicResultCard({
  pro,
  onSelect,
}: {
  pro: PublicSearchResult;
  onSelect?: () => void;
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const initials = `${pro.firstName[0] || ""}${pro.lastName[0] || ""}`;
  const days = pro.slotPreview.slice(0, 4);

  const nextSlotLabel = pro.nextSlotAt
    ? new Date(pro.nextSlotAt).toLocaleString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-0">
        {/* Profile */}
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="flex items-start gap-3">
            {pro.avatarUrl ? (
              <img
                src={pro.avatarUrl}
                alt={pro.name}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={pro.publicPath} className="font-bold text-slate-900 hover:text-brand-600">
                  {pro.name}
                </Link>
                <CheckCircle2 size={15} className="text-brand-500 shrink-0" />
              </div>
              <p className="text-sm text-brand-600 font-medium mt-0.5">
                {getProfessionLabel(lang, pro.specialty)}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StarRating avg={pro.ratingAvg} count={pro.ratingCount} />
                {pro.license && (
                  <span className="text-[11px] text-slate-400">{pro.license}</span>
                )}
              </div>
              {pro.trainingInstitution && (
                <p className="text-xs text-slate-500 mt-1">{pro.trainingInstitution}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {pro.acceptsTeleconsult && (
              <span className="text-[10px] font-medium bg-brand-50 text-brand-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Video size={10} /> {t("pub.teleconsult")}
              </span>
            )}
            {pro.acceptsInPerson && (
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Building2 size={10} /> {t("pub.inPerson")}
              </span>
            )}
          </div>

          {pro.clinicCity && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
              <MapPin size={12} className="text-brand-400 shrink-0" />
              {[pro.clinicAddress, pro.clinicCity].filter(Boolean).join(", ")}
            </p>
          )}

          {pro.healthPlans.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pro.healthPlans.slice(0, 4).map((hp) => (
                <span key={hp.slug} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">
                  {hp.name}
                </span>
              ))}
            </div>
          )}

          {pro.services.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {pro.services.slice(0, 2).map((svc, i) => (
                <p key={i} className="text-xs text-slate-600 flex justify-between gap-2">
                  <span className="truncate">{svc.name}</span>
                  <span className="font-medium text-slate-800 shrink-0">
                    {svc.priceCents != null
                      ? fmtPrice(svc.priceCents, svc.currency, locale)
                      : "?"}
                  </span>
                </p>
              ))}
            </div>
          )}

          {pro.locationCount > 1 && (
            <p className="text-[10px] text-brand-600 mt-1">
              {pro.locationCount} {t("pubPhase3.addresses")}
            </p>
          )}

          <p className="text-sm font-bold text-slate-800 mt-3">
            {fmtPrice(pro.consultPrice, pro.currency, locale)}
          </p>

          {nextSlotLabel && (
            <p className="text-[11px] text-brand-600 mt-1.5 flex items-center gap-1">
              <Clock size={11} />
              {t("pubSearch.nextSlot")}: {nextSlotLabel}
            </p>
          )}
        </div>

        {/* Slots grid */}
        <div className="p-5 bg-slate-50/50">
          {days.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{t("pubSearch.noSlotsCard")}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {days.map((day) => (
                <div key={day.date} className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-500 text-center mb-1.5 truncate">
                    {day.label}
                  </p>
                  <div className="space-y-1">
                    {day.slots.length === 0 ? (
                      <span className="block text-center text-slate-300 text-xs">?</span>
                    ) : (
                      day.slots.map((slot) => (
                        <Link
                          key={slot.datetime}
                          href={`/login?callbackUrl=${encodeURIComponent(
                            `/patient/appointments?pro=${pro.providerId}&providerType=${pro.providerType}&slot=${slot.datetime}`
                          )}`}
                          className="block text-center text-xs font-medium bg-white border border-brand-100 text-brand-600 hover:bg-brand-50 rounded-lg py-1.5 transition"
                        >
                          {slot.time}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href={pro.publicPath}
            onClick={onSelect}
            className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            {t("pubSearch.viewProfile")}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function buildSearchUrl(
  especialidade: string,
  cidade: string,
  filters?: { convenio?: string; teleconsult?: boolean; presencial?: boolean }
): string {
  const citySlug = cityToSeoSlug(cidade);
  const params = new URLSearchParams();
  if (filters?.convenio) params.set("convenio", filters.convenio);
  if (filters?.teleconsult) params.set("teleconsult", "1");
  if (filters?.presencial) params.set("presencial", "1");
  const qs = params.toString();
  return `/especialistas/${especialidade}/${citySlug}${qs ? `?${qs}` : ""}`;
}
