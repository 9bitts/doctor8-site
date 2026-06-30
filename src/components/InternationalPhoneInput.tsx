"use client";

import { useEffect } from "react";
import { translate, type Lang } from "@/lib/i18n/translations";
import { PHONE_COUNTRIES, phoneCountryLabel } from "@/lib/phone-countries";
import { defaultDdiForRegion } from "@/lib/international-phone";

export type InternationalPhoneValue = {
  ddi: string;
  nationalNumber: string;
};

type Props = {
  lang: Lang;
  value: InternationalPhoneValue;
  onChange: (value: InternationalPhoneValue) => void;
  region?: string;
  required?: boolean;
  dark?: boolean;
  className?: string;
  error?: string;
};

export default function InternationalPhoneInput({
  lang,
  value,
  onChange,
  region,
  required = true,
  dark = false,
  className = "",
  error,
}: Props) {
  const t = (key: string) => translate(lang, key);

  useEffect(() => {
    if (!value.ddi && region) {
      onChange({ ...value, ddi: defaultDdiForRegion(region) });
    }
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputClass = dark
    ? "min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
    : "min-w-0 flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
  const labelClass = dark ? "block text-sm font-medium text-slate-300 mb-2" : "text-xs font-medium text-slate-600";
  const selectClass = dark
    ? "w-[6.75rem] shrink-0 truncate bg-white/5 border border-white/10 rounded-xl px-2.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    : "w-[6.75rem] shrink-0 truncate border border-slate-200 rounded-xl px-2.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

  return (
    <div className={className}>
      <label className={labelClass}>{t("reg.phone")}</label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <select
          value={value.ddi}
          onChange={(e) => onChange({ ...value, ddi: e.target.value })}
          required={required}
          className={selectClass}
          aria-label={t("reg.phoneDdi")}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option
              key={c.iso2}
              value={c.dialCode}
              title={phoneCountryLabel(c, lang)}
              className={dark ? "bg-slate-800" : ""}
            >
              +{c.dialCode} {phoneCountryLabel(c, lang)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={value.nationalNumber}
          onChange={(e) =>
            onChange({ ...value, nationalNumber: e.target.value.replace(/[^\d\s()-]/g, "") })
          }
          placeholder={t("reg.phoneNationalPlaceholder")}
          required={required}
          className={inputClass}
          aria-label={t("reg.phoneNational")}
        />
      </div>
      <p className={`text-xs mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {t("reg.phoneHint")}
      </p>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
