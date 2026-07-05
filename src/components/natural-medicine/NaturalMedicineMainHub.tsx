"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Droplets,
  Flower2,
  Hexagon,
  Leaf,
  Sprout,
  Wind,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  type NaturalMedicinePortal,
  type NaturalMedicinePracticeConfig,
  NATURAL_MEDICINE_PRACTICES,
  naturalMedicineBasePath,
} from "@/lib/natural-medicine/config";

const ICONS = {
  Leaf,
  Flower2,
  Wind,
  Droplets,
  Hexagon,
} as const;

interface NaturalMedicineMainHubProps {
  portal: NaturalMedicinePortal;
  /** Integrative: only practices enabled in profile. Professional: all. */
  enabledPractices?: NaturalMedicinePracticeConfig[];
}

export default function NaturalMedicineMainHub({
  portal,
  enabledPractices,
}: NaturalMedicineMainHubProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = naturalMedicineBasePath(portal);

  const practices =
    enabledPractices ??
    (portal === "professional" ? NATURAL_MEDICINE_PRACTICES : []);

  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Sprout size={28} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("nm.hub.title")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("nm.hub.subtitle")}</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <p className="text-sm text-emerald-800 leading-relaxed">{t("nm.hub.banner")}</p>
      </div>

      {practices.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-amber-900">{t("nm.hub.noPractices")}</p>
          <Link
            href="/integrative-therapist/settings"
            className="inline-flex text-sm font-bold text-amber-700 hover:text-amber-900"
          >
            {t("nm.hub.setupAction")} →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {t("nm.hub.practicesTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {practices.map((p) => {
              const Icon = ICONS[p.icon];
              return (
                <Link
                  key={p.urlSlug}
                  href={href(`${base}/${p.urlSlug}`)}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-sm transition flex items-start gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                      {t(p.hubTitleKey)}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{t(p.cardDescKey)}</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-400 mt-1 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm">{t("nm.hub.disclaimerTitle")}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t("nm.hub.disclaimer")}</p>
      </section>
    </div>
  );
}
