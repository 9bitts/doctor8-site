"use client";

import { translate, type Lang } from "@/lib/i18n/translations";
import {
  REGISTRATION_REGION_GROUPS,
  registrationRegionLabel,
  parseRegistrationRegion,
  type RegistrationRegionCode,
} from "@/lib/registration-regions";

type Props = {
  value: RegistrationRegionCode;
  onChange: (code: RegistrationRegionCode) => void;
  lang: Lang;
  className?: string;
  optionClassName?: string;
};

export default function RegistrationRegionSelect({
  value,
  onChange,
  lang,
  className,
  optionClassName,
}: Props) {
  const t = (key: string) => translate(lang, key);

  return (
    <select
      value={value}
      onChange={(e) => onChange(parseRegistrationRegion(e.target.value, value))}
      className={className}
    >
      {REGISTRATION_REGION_GROUPS.map((group) => (
        <optgroup key={group.key} label={t(group.labelKey)}>
          {group.codes.map((code) => (
            <option key={code} value={code} className={optionClassName}>
              {registrationRegionLabel(code, lang)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
