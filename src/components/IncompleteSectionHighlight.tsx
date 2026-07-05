"use client";

import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AlertCircle } from "lucide-react";

type Props = {
  id?: string;
  incomplete?: boolean;
  children: ReactNode;
  className?: string;
};

export default function IncompleteSectionHighlight({
  id,
  incomplete = false,
  children,
  className = "",
}: Props) {
  const { t } = useI18n();

  return (
    <div
      id={id}
      className={`scroll-mt-24 ${className} ${
        incomplete
          ? "rounded-2xl border-2 border-red-400 bg-red-50/40 ring-1 ring-red-200/80"
          : ""
      }`}
    >
      {incomplete && (
        <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {t("reg.incompleteSection")}
        </div>
      )}
      {children}
    </div>
  );
}

export function incompleteFieldClass(incomplete: boolean): string {
  return incomplete ? "text-red-600 font-semibold" : "text-slate-600";
}

export function incompleteInputClass(incomplete: boolean, base: string): string {
  return incomplete
    ? `${base} border-red-400 bg-red-50/50 focus:ring-red-400/40 focus:border-red-400`
    : base;
}
