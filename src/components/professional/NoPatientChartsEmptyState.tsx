"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { professionalPatientsListHref } from "@/lib/psychologist-portal";

type Variant = "brand" | "teal" | "violet" | "fuchsia" | "sky" | "indigo" | "rose" | "amber";

const VARIANT_STYLES: Record<
  Variant,
  { border: string; iconBg: string; icon: string; button: string }
> = {
  brand: {
    border: "border-brand-200 bg-brand-50/50",
    iconBg: "bg-brand-100",
    icon: "text-brand-500",
    button: "bg-brand-500 hover:bg-brand-600",
  },
  teal: {
    border: "border-teal-200 bg-teal-50/50",
    iconBg: "bg-teal-100",
    icon: "text-teal-600",
    button: "bg-teal-600 hover:bg-teal-700",
  },
  violet: {
    border: "border-violet-200 bg-violet-50/50",
    iconBg: "bg-violet-100",
    icon: "text-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
  },
  fuchsia: {
    border: "border-fuchsia-200 bg-fuchsia-50/50",
    iconBg: "bg-fuchsia-100",
    icon: "text-fuchsia-600",
    button: "bg-fuchsia-600 hover:bg-fuchsia-700",
  },
  sky: {
    border: "border-sky-200 bg-sky-50/50",
    iconBg: "bg-sky-100",
    icon: "text-sky-600",
    button: "bg-sky-600 hover:bg-sky-700",
  },
  indigo: {
    border: "border-indigo-200 bg-indigo-50/50",
    iconBg: "bg-indigo-100",
    icon: "text-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700",
  },
  rose: {
    border: "border-rose-200 bg-rose-50/50",
    iconBg: "bg-rose-100",
    icon: "text-rose-600",
    button: "bg-rose-600 hover:bg-rose-700",
  },
  amber: {
    border: "border-amber-200 bg-amber-50/50",
    iconBg: "bg-amber-100",
    icon: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700",
  },
};

export default function NoPatientChartsEmptyState({
  variant = "brand",
  compact = false,
  href,
  onAction,
}: {
  variant?: Variant;
  compact?: boolean;
  href?: string;
  onAction?: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  const styles = VARIANT_STYLES[variant];
  const patientsHref = href ?? professionalPatientsListHref(pathname);

  const actionClass = `inline-flex items-center gap-2 text-white font-semibold rounded-xl transition text-sm ${styles.button} ${
    compact ? "px-4 py-2" : "px-5 py-2.5"
  }`;

  return (
    <div
      className={`rounded-xl border text-center ${
        compact ? "py-5 px-4 space-y-2.5" : "py-8 px-5 space-y-3"
      } ${styles.border}`}
    >
      <div
        className={`mx-auto rounded-xl flex items-center justify-center ${
          compact ? "w-10 h-10" : "w-12 h-12"
        } ${styles.iconBg}`}
      >
        <Users size={compact ? 20 : 24} className={styles.icon} />
      </div>
      <div>
        <p className={`font-semibold text-slate-800 ${compact ? "text-sm" : "text-base"}`}>
          {t("pat.emptyFeature.title")}
        </p>
        <p className={`text-slate-500 mt-1 ${compact ? "text-xs" : "text-sm"}`}>
          {t("pat.emptyFeature.hint")}
        </p>
      </div>
      {onAction ? (
        <button type="button" onClick={onAction} className={actionClass}>
          <Plus size={16} />
          {t("pat.emptyFeature.action")}
        </button>
      ) : (
        <Link href={patientsHref} className={actionClass}>
          <Plus size={16} />
          {t("pat.emptyFeature.action")}
        </Link>
      )}
    </div>
  );
}
