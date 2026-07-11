import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { PATIENT_SCHEDULED_VOLUNTEER_ENTRY } from "@/lib/platform-nav-registry";

type Props = {
  lang: Lang;
};

export default function ScheduledVolunteerBanner({ lang }: Props) {
  const t = (key: string) => translate(lang, key);

  return (
    <Link
      href={PATIENT_SCHEDULED_VOLUNTEER_ENTRY.href}
      className="block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-sky-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-amber-300"
    >
      <div className="p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100">
          <Calendar size={28} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            {t("volAppt.banner.eyebrow")}
          </p>
          <p className="text-lg font-bold text-slate-900">{t("volAppt.banner.title")}</p>
          <p className="text-sm mt-1 text-slate-600">{t("volAppt.banner.desc")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0 text-amber-800">
          {t("volAppt.banner.cta")}
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}
