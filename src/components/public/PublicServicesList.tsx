"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { ProviderServiceDto } from "@/lib/practice";
import { SERVICE_EVENT } from "@/components/public/PublicBookingPanel";

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

function selectService(serviceId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("service", serviceId);
  window.history.replaceState({}, "", url);
  window.dispatchEvent(new CustomEvent(SERVICE_EVENT, { detail: { serviceId } }));
  document.getElementById("public-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PublicServicesList({
  services,
  defaultPrice,
  currency,
  interactive = true,
}: {
  services: ProviderServiceDto[];
  defaultPrice: number;
  currency: string;
  interactive?: boolean;
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);

  if (services.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-400">{t("pub.consultPrice")}</p>
        <p className="text-2xl font-bold text-slate-900">
          {fmtPrice(defaultPrice, currency, locale)}
        </p>
      </div>
    );
  }

  const visible = services.filter((s) => s.isActive);

  function ServiceRow({ svc }: { svc: ProviderServiceDto }) {
    const price =
      svc.priceCents === 0
        ? t("consultServices.volunteerPrice")
        : svc.priceCents != null
          ? fmtPrice(svc.priceCents, svc.currency || currency, locale)
          : t("pubPhase3.priceUnavailable");

    if (!interactive) {
      return (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">{svc.name}</span>
          <span className="font-semibold text-slate-900">{price}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => selectService(svc.id)}
        className="flex items-center justify-between text-sm w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-brand-50 transition"
      >
        <span className="text-slate-700">{svc.name}</span>
        <span className="font-semibold text-brand-600">{price}</span>
      </button>
    );
  }

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">{t("pubPhase3.servicesTitle")}</p>
      {visible.map((svc) => (
        <ServiceRow key={svc.id} svc={svc} />
      ))}
    </div>
  );
}
