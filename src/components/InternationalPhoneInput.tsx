"use client";

import { useEffect, useMemo } from "react";
import { translate, type Lang } from "@/lib/i18n/translations";
import { PHONE_COUNTRIES, phoneCountryLabel } from "@/lib/phone-countries";
import {
  defaultDdiForRegion,
  getRegistrationPhoneIssue,
  registrationPhoneErrorMessage,
} from "@/lib/international-phone";

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
    if (!region) return;
    const ddi = defaultDdiForRegion(region);
    if (ddi !== value.ddi) {
      onChange({ ...value, ddi });
    }
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const countries = useMemo(() => {
    const preferredIso = region && region !== "EU" ? region.toUpperCase() : null;
    if (!preferredIso) return PHONE_COUNTRIES;
    const preferred = PHONE_COUNTRIES.find((c) => c.iso2 === preferredIso);
    if (!preferred) return PHONE_COUNTRIES;
    return [preferred, ...PHONE_COUNTRIES.filter((c) => c.iso2 !== preferredIso)];
  }, [region]);

  const validationIssue = getRegistrationPhoneIssue(value.ddi, value.nationalNumber);
  const inlineError =
    error ||
    (validationIssue ? registrationPhoneErrorMessage(lang, validationIssue) : undefined);

  const inputClass = dark
    ? "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
    : "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
  const labelClass = dark ? "block text-sm font-medium text-slate-300 mb-1.5" : "text-xs font-medium text-slate-600";
  const selectClass = dark
    ? "w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    : "w-full border border-slate-200 rounded-xl px-2.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

  return (
    <div className={className}>
      <label className={labelClass}>{t("reg.phone")}</label>
      <div className="mt-1.5 flex flex-col gap-2">
        <select
          value={value.ddi}
          onChange={(e) => onChange({ ...value, ddi: e.target.value })}
          required={required}
          className={selectClass}
          aria-label={t("reg.phoneDdi")}
        >
          {countries.map((c) => (
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
          aria-invalid={Boolean(inlineError)}
        />
      </div>
      <p className={`text-xs mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {t("reg.phoneHint")}
      </p>
      {inlineError && <p className="text-red-400 text-xs mt-1">{inlineError}</p>}
    </div>
  );
}
