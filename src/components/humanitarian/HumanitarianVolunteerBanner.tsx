import Link from "next/link";
import { ChevronRight, Radio, Phone } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { poolLabel } from "@/lib/humanitarian/constants";

export type VolunteerBannerState = {
  status: "OFFLINE" | "ONLINE" | "BUSY";
  pool?: { labelEs: string; labelPt: string; labelEn: string };
  entryId?: string | null;
};

type Props = {
  lang: Lang;
  campaignActive: boolean;
  volunteer?: VolunteerBannerState | null;
  /** @deprecated Banner always shows Venezuela flag; kept for call-site compat. */
  psychologyPortal?: boolean;
};

function VenezuelaFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      className={className}
      aria-hidden
      role="img"
    >
      <title>Venezuela</title>
      <rect width="36" height="8" y="0" fill="#FFCC00" />
      <rect width="36" height="8" y="8" fill="#00247D" />
      <rect width="36" height="8" y="16" fill="#CF142B" />
      {/* Arc of stars (simplified) */}
      <g fill="#fff">
        <circle cx="12" cy="11.5" r="0.7" />
        <circle cx="14" cy="10.2" r="0.7" />
        <circle cx="16.5" cy="9.5" r="0.7" />
        <circle cx="19.5" cy="9.5" r="0.7" />
        <circle cx="22" cy="10.2" r="0.7" />
        <circle cx="24" cy="11.5" r="0.7" />
      </g>
    </svg>
  );
}

export default function HumanitarianVolunteerBanner({ lang, campaignActive, volunteer }: Props) {
  if (!campaignActive) return null;

  const t = (key: string) => translate(lang, key);
  const href = "/humanitarian/volunteer";
  const poolName = volunteer?.pool ? poolLabel(volunteer.pool, lang) : "";

  if (volunteer?.status === "BUSY" && volunteer.entryId) {
    return (
      <Link
        href={`/video/humanitarian/${volunteer.entryId}`}
        className="block rounded-2xl border-2 border-emerald-400 bg-emerald-50 shadow-sm overflow-hidden transition hover:shadow-md"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-200">
            <Phone size={28} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              {t("hum.vol.banner.eyebrow")}
            </p>
            <p className="text-lg font-bold text-emerald-900">{t("hum.vol.banner.inConsult")}</p>
            {poolName && <p className="text-sm mt-1 text-emerald-800">{poolName}</p>}
          </div>
          <ChevronRight size={20} className="text-emerald-700 shrink-0" />
        </div>
      </Link>
    );
  }

  if (volunteer?.status === "ONLINE") {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-emerald-300"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100">
            <Radio size={28} className="text-emerald-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              {t("hum.vol.banner.eyebrow")}
            </p>
            <p className="text-lg font-bold text-emerald-900">{t("hum.vol.banner.onlineTitle")}</p>
            {poolName && <p className="text-sm mt-1 text-emerald-700">{poolName}</p>}
            <p className="text-sm mt-1 text-emerald-700">{t("hum.vol.banner.onlineDesc")}</p>
          </div>
          <ChevronRight size={20} className="text-emerald-700 shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-rose-300"
    >
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
        <div className="w-10 h-7 sm:w-11 sm:h-8 rounded-md overflow-hidden shrink-0 shadow-sm ring-1 ring-black/10">
          <VenezuelaFlagIcon className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-red-600 leading-tight">
            {t("hum.vol.banner.title")}
          </p>
          <p className="mt-0.5 text-xs sm:text-sm font-semibold text-red-600 inline-flex items-center gap-0.5">
            {t("hum.vol.banner.cta")}
            <ChevronRight size={14} className="shrink-0" />
          </p>
        </div>
      </div>
    </Link>
  );
}
