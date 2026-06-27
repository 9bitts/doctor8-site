"use client";

import Link from "next/link";
import { translate, type Lang } from "@/lib/i18n/translations";

type Props = {
  lang: Lang;
  checked: boolean;
  onChange: (v: boolean) => void;
  dark?: boolean;
  termHref?: string;
  openInNewTab?: boolean;
};

export default function TelemedicineTcleConsent({
  lang,
  checked,
  onChange,
  dark = false,
  termHref = "/tcle-telemedicina",
  openInNewTab = true,
}: Props) {
  const t = (key: string) => translate(lang, key);
  const border = dark ? "border-white/10 hover:border-white/20" : "border-slate-200 hover:border-slate-300";
  const text = dark ? "text-slate-300" : "text-slate-700";
  const linkClass = dark
    ? "text-emerald-400 underline underline-offset-2 hover:text-emerald-300 font-medium"
    : "text-emerald-700 underline underline-offset-2 hover:text-emerald-800 font-medium";

  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${border} ${
        checked ? (dark ? "bg-emerald-500/10 border-emerald-500/40" : "bg-emerald-50 border-emerald-200") : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
      />
      <span className={`text-sm leading-relaxed ${text}`}>
        {t("tcle.acceptPrefix")}{" "}
        <Link
          href={termHref}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {t("tcle.termLink")}
        </Link>
        {t("tcle.acceptSuffix")}
      </span>
    </label>
  );
}
