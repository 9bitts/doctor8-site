"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import { ArrowLeft, Shield, ExternalLink } from "lucide-react";

const SECTIONS = [
  "psy.compliance.s1", "psy.compliance.s2", "psy.compliance.s3",
  "psy.compliance.s4", "psy.compliance.s5", "psy.compliance.s6",
] as const;

export default function PsychologyCompliancePage() {
  const { t } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield size={24} className="text-emerald-600" />
          {t("psy.mod.compliance.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.mod.compliance.desc")}</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-emerald-900">{t("psy.compliance.refTitle")}</p>
        <p className="text-sm text-emerald-800 mt-1">{t("psy.compliance.refDesc")}</p>
        <a
          href="https://atosoficiais.com.br/cfp/resolucao-do-exercicio-profissional-n-9-2024-regulamenta-o-exercicio-profissional-da-psicologia-mediado-por-tdics-em-territorio-nacional"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 mt-3"
        >
          CFP Resolução nº 09/2024 <ExternalLink size={14} />
        </a>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((key) => (
          <div key={key} className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">{t(`${key}.title`)}</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line">{t(`${key}.body`)}</p>
          </div>
        ))}
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
        <p className="text-sm text-violet-800">{t("psy.compliance.platformNote")}</p>
      </div>
    </div>
  );
}
