"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import AcuraVolunteerBadge from "@/components/acura/AcuraVolunteerBadge";

type Props = {
  volunteersOnly: boolean;
  onToggleVolunteers: () => void;
  compact?: boolean;
};

/** Public search / landing ? AcuraBrasil voluntary care CTA + filter toggle. */
export default function AcuraVolunteerSearchBanner({
  volunteersOnly,
  onToggleVolunteers,
  compact = false,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className={`bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 ${
        compact ? "p-3 mx-4 mb-4" : "p-4"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-sky-900">{t("acura.vol.bookingBannerTitle")}</p>
          <AcuraVolunteerBadge size="sm" showInfoIcon={false} />
        </div>
        <p className="text-xs text-sky-800 leading-relaxed">{t("acura.vol.bookingBannerText")}</p>
        {volunteersOnly && (
          <p className="text-xs font-medium text-green-800 mt-2">{t("acura.vol.filterActiveHint")}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleVolunteers}
        className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
          volunteersOnly
            ? "bg-sky-600 text-white border-sky-600"
            : "bg-white text-sky-800 border-sky-300 hover:bg-sky-100"
        }`}
      >
        {t("acura.vol.filter")}
      </button>
    </div>
  );
}
