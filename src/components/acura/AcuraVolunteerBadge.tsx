"use client";

import { useId } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ACURA_VOLUNTEER_LOGO } from "@/lib/acura-volunteer";

type Props = {
  size?: "sm" | "md";
  className?: string;
  showInfoIcon?: boolean;
};

export default function AcuraVolunteerBadge({
  size = "sm",
  className = "",
  showInfoIcon = true,
}: Props) {
  const { t } = useI18n();
  const tooltipId = useId();
  const logoW = size === "sm" ? 72 : 96;
  const logoH = size === "sm" ? 18 : 24;

  return (
    <span className={`relative inline-flex group ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-900 font-medium ${size === "sm" ? "text-[10px] px-2 py-1" : "text-xs px-2.5 py-1.5"}`}
        aria-describedby={tooltipId}
      >
        <Image
          src={ACURA_VOLUNTEER_LOGO}
          alt="AcuraBrasil"
          width={logoW}
          height={logoH}
          className="h-auto w-auto max-h-[18px] object-contain"
          unoptimized
        />
        <span className="whitespace-nowrap">{t("acura.vol.badgeShort")}</span>
        {showInfoIcon && (
          <Info size={size === "sm" ? 10 : 12} className="text-sky-600/80 shrink-0" aria-hidden />
        )}
      </span>

      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-lg opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        <p className="font-semibold text-sky-900 mb-1">{t("acura.vol.badge")}</p>
        <p className="leading-relaxed">{t("acura.vol.badgeTooltip")}</p>
      </span>
    </span>
  );
}
