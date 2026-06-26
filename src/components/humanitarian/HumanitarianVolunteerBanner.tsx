import Link from "next/link";
import { Heart, ChevronRight, Radio, Phone, AlertTriangle, Stethoscope } from "lucide-react";
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
};

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
      className="block rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-rose-300"
    >
      <div className="p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-100">
          <Stethoscope size={28} className="text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle size={12} /> {t("hum.vol.banner.eyebrow")}
          </p>
          <p className="text-lg font-bold text-slate-900">{t("hum.vol.banner.title")}</p>
          <p className="text-sm mt-1 text-slate-600">{t("hum.vol.banner.desc")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 text-rose-700">
          {t("hum.vol.banner.cta")}
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}
