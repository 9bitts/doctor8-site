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
  /** When true, section is styled in red (missing registration item). */
  incomplete?: boolean;
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
  incomplete = false,
  open,
  onToggle,
  children,
  optional = false,
}: ProfileSettingsSectionProps) {
  const { t } = useI18n();
  const showIncomplete = incomplete && !complete;
  return (
    <section
      id={id}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-24 ${
        showIncomplete
          ? "border-2 border-red-400 ring-1 ring-red-200/80"
          : "border border-slate-100"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition ${
          showIncomplete ? "hover:bg-red-50/50" : "hover:bg-slate-50/80"
        }`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            complete
              ? "bg-emerald-50 text-emerald-600"
              : showIncomplete
                ? "bg-red-50 text-red-600"
                : "bg-brand-50 text-brand-500"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`font-semibold ${showIncomplete ? "text-red-700" : "text-slate-800"}`}>
              {title}
            </h2>
            {optional && (
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                {t("set.optional")}
              </span>
            )}
            {showIncomplete && (
              <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                {t("reg.incompleteSection")}
              </span>
            )}
          </div>
          {description && !open && (
            <p className={`text-xs mt-0.5 truncate ${showIncomplete ? "text-red-600/80" : "text-slate-500"}`}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {complete ? (
            <CheckCircle2 size={20} className="text-emerald-500" aria-label="Completo" />
          ) : (
            <Circle
              size={20}
              className={showIncomplete ? "text-red-500 fill-red-500" : "text-slate-300"}
              aria-label="Incompleto"
            />
          )}
          <ChevronDown
            size={18}
            className={`transition-transform ${open ? "rotate-180" : ""} ${
              showIncomplete ? "text-red-400" : "text-slate-400"
            }`}
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
