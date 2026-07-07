"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Flower2, Stethoscope } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  floralBySlug,
  FLORAL_CATEGORY_ACCENT,
  floralCategoryLabelKey,
} from "@/lib/florais-catalog/data";
import { detectFloraisPortal, floraisBasePath } from "@/lib/florais-catalog/portal-config";

export default function FloralItemDetail({ slug }: { slug: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const portal = detectFloraisPortal(pathname);
  const base = floraisBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const item = floralBySlug(slug);

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-slate-500">{t("fl.detail.notFound")}</p>
        <Link href={href(base)} className="text-pink-600 font-semibold text-sm mt-4 inline-block">
          {t("fl.hub.navBack")}
        </Link>
      </div>
    );
  }

  const accent = FLORAL_CATEGORY_ACCENT[item.category];
  const prescribeHref =
    portal === "integrative-therapist"
      ? `/integrative-therapist/prescriptions?add=floral&floralProduct=${encodeURIComponent(item.slug)}`
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <Link
        href={href(base)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-800"
      >
        <ArrowLeft size={16} /> {t("fl.hub.navBack")}
      </Link>

      <header
        className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8"
        style={{ borderTopWidth: 4, borderTopColor: accent }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t(floralCategoryLabelKey(item.category))}
          {item.groupKey && (
            <span className="normal-case font-normal text-slate-500"> · {t(item.groupKey)}</span>
          )}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">{t(item.labelKey)}</h1>

        {item.negKey && item.posKey ? (
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
              <p className="text-xs font-semibold text-rose-800">{t("fl.detail.negativo")}</p>
              <p className="text-sm text-rose-900 mt-1">{t(item.negKey)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-semibold text-emerald-800">{t("fl.detail.positivo")}</p>
              <p className="text-sm text-emerald-900 mt-1">{t(item.posKey)}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 mt-4 leading-relaxed">{t(item.indicationKey)}</p>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-pink-50 border border-pink-100 p-4">
          <Flower2 size={20} className="text-pink-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-pink-800">{t("fl.detail.indicacao")}</p>
            <p className="text-sm text-pink-900 mt-1 leading-relaxed">{t(item.indicationKey)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-600">{t("fl.detail.posologia")}</p>
          <p className="text-sm text-slate-800 mt-1">{t("it.ref.florais.4")}</p>
        </div>
      </header>

      {prescribeHref && (
        <Link
          href={href(prescribeHref)}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-md shadow-pink-500/20"
        >
          <Stethoscope size={16} />
          {t("fl.detail.prescrever")}
        </Link>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {t("fl.hub.disclaimer")}
      </p>
    </div>
  );
}
