"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { ProviderServiceDto } from "@/lib/practice";

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

export default function PublicServicesList({
  services,
  defaultPrice,
  currency,
}: {
  services: ProviderServiceDto[];
  defaultPrice: number;
  currency: string;
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
  const [first, ...rest] = visible;

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">{t("pubPhase3.servicesTitle")}</p>
      {first && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">{first.name}</span>
          <span className="font-semibold text-slate-900">
            {first.priceCents != null
              ? fmtPrice(first.priceCents, first.currency || currency, locale)
              : t("pubPhase3.priceUnavailable")}
          </span>
        </div>
      )}
      {rest.slice(0, 4).map((svc) => (
        <div key={svc.id} className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{svc.name}</span>
          <span className="font-medium text-slate-800">
            {svc.priceCents != null
              ? fmtPrice(svc.priceCents, svc.currency || currency, locale)
              : t("pubPhase3.priceUnavailable")}
          </span>
        </div>
      ))}
      {rest.length > 4 && (
        <p className="text-xs text-brand-600 font-medium">{t("pubPhase3.moreServices")}</p>
      )}
    </div>
  );
}
