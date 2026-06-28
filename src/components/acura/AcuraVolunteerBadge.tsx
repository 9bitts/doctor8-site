"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ACURA_VOLUNTEER_LOGO } from "@/lib/acura-volunteer";

type Props = {
  size?: "sm" | "md";
  className?: string;
};

export default function AcuraVolunteerBadge({ size = "sm", className = "" }: Props) {
  const { t } = useI18n();
  const logoH = size === "sm" ? 18 : 24;
  const logoW = size === "sm" ? 72 : 96;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-900 font-medium ${size === "sm" ? "text-[10px] px-2 py-1" : "text-xs px-2.5 py-1.5"} ${className}`}
      title={t("acura.vol.badge")}
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
    </span>
  );
}
