"use client";

import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

type Props = {
  lang: Lang;
  campaignSlug?: string;
};

export default function HumanitarianAnamneseReminder({ lang, campaignSlug = VENEZUELA_CAMPAIGN_SLUG }: Props) {
  const t = (key: string) => translate(lang, key);

  return (
    <Link
      href={`/humanitarian/${campaignSlug}/anamnese`}
      className="block rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden transition hover:shadow-md hover:border-amber-300"
    >
      <div className="p-4 sm:p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
          <FileText size={22} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">{t("hum.anamnese.reminderTitle")}</p>
          <p className="text-xs mt-1 text-amber-800">{t("hum.anamnese.reminderDesc")}</p>
        </div>
        <ChevronRight size={18} className="text-amber-700 shrink-0" />
      </div>
    </Link>
  );
}
