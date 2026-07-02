"use client";

import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";

export type ProfileSettingsSectionProps = {
  id: string;
  title: string;
  description?: string;
  icon: ReactNode;
  complete?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  optional?: boolean;
};

export default function ProfileSettingsSection({
  id,
  title,
  description,
  icon,
  complete = false,
  open,
  onToggle,
  children,
  optional = false,
}: ProfileSettingsSectionProps) {
  const { t } = useI18n();
  return (
    <section id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/80 transition"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            complete ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-500"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-slate-800">{title}</h2>
            {optional && (
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                {t("set.optional")}
              </span>
            )}
          </div>
          {description && !open && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {complete ? (
            <CheckCircle2 size={20} className="text-emerald-500" aria-label="Completo" />
          ) : (
            <Circle size={20} className="text-slate-300" aria-label="Incompleto" />
          )}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div id={`${id}-panel`} className="px-5 pb-5 pt-0 border-t border-slate-100">
          {description && open && (
            <p className="text-sm text-slate-500 mt-4 mb-1">{description}</p>
          )}
          <div className={description ? "mt-3" : "mt-4"}>{children}</div>
        </div>
      )}
    </section>
  );
}
