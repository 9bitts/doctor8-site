import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import { getProfessionInfo } from "@/lib/profession-label";

type Props = {
  lang: Lang;
  specialty: string;
  settingsHref: string;
};

export default function IncompleteLicenseBanner({ lang, specialty, settingsHref }: Props) {
  const t = (key: string) => translate(lang, key);
  const councilKey = getProfessionInfo(specialty).councilKey;
  const councilLabel =
    councilKey === "crn_nutrition"
      ? "CRN"
      : councilKey.toUpperCase().replace("_NUTRITION", "N");

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 flex items-start gap-3">
      <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {t("pro.banner.completeLicense").replace("{council}", councilLabel)}
        </p>
        <Link
          href={settingsHref}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium underline mt-1 inline-block"
        >
          {t("pro.banner.completeLicenseLink")}
        </Link>
      </div>
    </div>
  );
}
