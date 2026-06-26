import Link from "next/link";
import { Heart, ChevronRight, Radio, Phone, AlertTriangle } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { VENEZUELA_CAMPAIGN_SLUG, poolLabel } from "@/lib/humanitarian/constants";

type Props = {
  lang: Lang;
  campaign: { slug: string; name: string } | null;
  entry: {
    id: string;
    status: string;
    pool: { labelEs: string; labelPt: string; labelEn: string };
  } | null;
};

export default function HumanitarianBanner({ lang, campaign, entry }: Props) {
  if (!campaign) return null;

  const t = (key: string) => translate(lang, key);
  const href = `/humanitarian/${campaign.slug || VENEZUELA_CAMPAIGN_SLUG}`;
  const poolName = entry ? poolLabel(entry.pool, lang) : "";

  if (entry?.status === "CALLED") {
    return (
      <Link
        href={`/video/humanitarian/${entry.id}`}
        className="block rounded-2xl border-2 border-emerald-400 bg-emerald-50 shadow-sm overflow-hidden transition hover:shadow-md animate-pulse"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-200">
            <Phone size={28} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              {t("hum.banner.calledEyebrow")}
            </p>
            <p className="text-lg font-bold text-emerald-900">{t("hum.banner.calledTitle")}</p>
            <p className="text-sm mt-1 text-emerald-800">{t("hum.banner.calledDesc")}</p>
          </div>
          <ChevronRight size={20} className="text-emerald-700 shrink-0" />
        </div>
      </Link>
    );
  }

  if (entry?.status === "IN_PROGRESS") {
    return (
      <Link
        href={`/video/humanitarian/${entry.id}`}
        className="block rounded-2xl border border-blue-200 bg-blue-50 shadow-sm overflow-hidden transition hover:shadow-md"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-100">
            <Radio size={28} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-blue-900">{t("hum.banner.inProgressTitle")}</p>
            <p className="text-sm mt-1 text-blue-700">{poolName}</p>
          </div>
          <ChevronRight size={20} className="text-blue-600 shrink-0" />
        </div>
      </Link>
    );
  }

  if (entry?.status === "WAITING") {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-rose-200 bg-rose-50 shadow-sm overflow-hidden transition hover:shadow-md"
      >
        <div className="p-5 sm:p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-100">
            <Heart size={28} className="text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-rose-900">{t("hum.banner.waitingTitle")}</p>
            <p className="text-sm mt-1 text-rose-700">{poolName}</p>
          </div>
          <ChevronRight size={20} className="text-rose-600 shrink-0" />
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
          <Heart size={28} className="text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle size={12} /> {t("hum.banner.free")}
          </p>
          <p className="text-lg font-bold text-slate-900">{t("hum.banner.title")}</p>
          <p className="text-sm mt-1 text-slate-600">{t("hum.banner.desc")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 text-rose-700">
          {t("hum.banner.cta")}
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}
