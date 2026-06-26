import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";

type Props = {
  lang: Lang;
  campaignActive: boolean;
};

export default function HumanitarianVolunteerBanner({ lang, campaignActive }: Props) {
  if (!campaignActive) return null;

  const t = (key: string) => translate(lang, key);

  return (
    <Link
      href="/humanitarian/volunteer"
      className="block rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-rose-300"
    >
      <div className="p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-100">
          <Heart size={28} className="text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
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
