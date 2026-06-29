"use client";

import { useMemo } from "react";
import { translate } from "@/lib/i18n/translations";
import { getConsultTemplate, type StructuredValues } from "@/lib/pics/consult-templates";

type Lang = "pt" | "en" | "es";

interface IntegrativeStructuredFormProps {
  lang: Lang;
  practiceSlug: string;
  values: StructuredValues;
  onChange: (values: StructuredValues) => void;
  dark?: boolean;
  sectionKeys?: string[];
}

export default function IntegrativeStructuredForm({
  lang,
  practiceSlug,
  values,
  onChange,
  dark = false,
  sectionKeys,
}: IntegrativeStructuredFormProps) {
  const t = (key: string) => translate(lang, key);
  const template = getConsultTemplate(practiceSlug);

  const sections = useMemo(() => {
    if (!template) return [];
    const grouped = new Map<string, typeof template.fields>();
    for (const field of template.fields) {
      const section = field.sectionKey ?? "it.tpl.section.notes";
      if (sectionKeys?.length && !sectionKeys.includes(section)) continue;
      const list = grouped.get(section) ?? [];
      list.push(field);
      grouped.set(section, list);
    }
    return Array.from(grouped.entries());
  }, [template, sectionKeys]);

  if (!template) return null;
  if (sections.length === 0) return null;

  const label = dark ? "text-xs font-medium text-slate-300" : "text-xs font-medium text-slate-600";
  const sectionTitle = dark ? "text-[10px] font-bold uppercase tracking-wide text-teal-400" : "text-[10px] font-bold uppercase tracking-wide text-teal-700";
  const input = dark
    ? "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
    : "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";
  const checkboxLabel = dark ? "text-xs text-slate-300" : "text-xs text-slate-700";

  function setField(key: string, value: string | boolean) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-4">
      {!sectionKeys?.length && (
        <p className={`${label} font-semibold`}>{t("it.tpl.structuredTitle")}</p>
      )}
      {sections.map(([sectionKey, fields]) => (
        <div key={sectionKey} className="space-y-2.5">
          <p className={sectionTitle}>{t(sectionKey)}</p>
          {fields.map((field) => {
            if (field.type === "checkbox") {
              return (
                <label key={field.key} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-400 text-teal-600 focus:ring-teal-500"
                    checked={!!values[field.key]}
                    onChange={(e) => setField(field.key, e.target.checked)}
                  />
                  <span className={checkboxLabel}>{t(field.labelKey)}</span>
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <div key={field.key}>
                  <label className={`${label} block mb-1`}>{t(field.labelKey)}</label>
                  <select
                    className={input}
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => setField(field.key, e.target.value)}
                  >
                    <option value="">{t("it.clients.selectPractice")}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            const isTextarea = field.type === "textarea";
            const shared = {
              className: isTextarea ? `${input} resize-none` : input,
              value: String(values[field.key] ?? ""),
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setField(field.key, e.target.value),
              placeholder: field.placeholderKey ? t(field.placeholderKey) : undefined,
            };

            return (
              <div key={field.key}>
                <label className={`${label} block mb-1`}>{t(field.labelKey)}</label>
                {isTextarea ? (
                  <textarea {...shared} rows={field.rows ?? 2} />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    {...shared}
                    min={field.type === "number" ? 0 : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
