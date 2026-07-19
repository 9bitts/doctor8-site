"use client";

import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DoctorImageSettings from "@/components/DoctorImageSettings";

const IT_VARIANT = "integrative_therapist" as const;

export default function IntegrativeDoctorImagePage() {
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={22} className="text-teal-500" />
          {t("nav.doctorImage")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t("it.settings.publicProfileDesc")}</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <DoctorImageSettings
          variant={IT_VARIANT}
          apiPath="/api/integrative-therapist/public-profile"
        />
      </div>
    </div>
  );
}
