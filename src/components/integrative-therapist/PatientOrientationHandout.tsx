"use client";

import { useMemo, useState } from "react";
import { Copy, CheckCircle2, Printer, FileDown } from "lucide-react";
import { translate } from "@/lib/i18n/translations";
import {
  generatePatientHandout,
  handoutHasContent,
} from "@/lib/pics/patient-orientation";
import type { IntegrativeVisitType } from "@/lib/integrative-consult-context";
import type { StructuredValues } from "@/lib/pics/consult-templates";
import { hasStructuredTemplate } from "@/lib/pics/consult-templates";

type Lang = "pt" | "en" | "es";

interface PatientOrientationHandoutProps {
  lang: Lang;
  practiceSlug: string;
  structuredValues: StructuredValues;
  visitType: IntegrativeVisitType;
  clientName: string;
  freeTextNote?: string;
  dark?: boolean;
}

export default function PatientOrientationHandout({
  lang,
  practiceSlug,
  structuredValues,
  visitType,
  clientName,
  freeTextNote,
  dark = false,
}: PatientOrientationHandoutProps) {
  const t = (key: string) => translate(lang, key);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const canGenerate = hasStructuredTemplate(practiceSlug)
    && handoutHasContent({ practiceSlug, structured: structuredValues, freeTextNote });

  const handout = useMemo(() => {
    if (!canGenerate) return "";
    return generatePatientHandout({
      practiceSlug,
      structured: structuredValues,
      lang,
      clientName,
      visitType,
      freeTextNote,
    });
  }, [canGenerate, practiceSlug, structuredValues, lang, clientName, visitType, freeTextNote]);

  if (!hasStructuredTemplate(practiceSlug)) return null;

  async function copyText() {
    if (!handout) return;
    try {
      await navigator.clipboard.writeText(handout);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  function printHandout() {
    if (!handout) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const escaped = handout
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    w.document.write(`<!DOCTYPE html><html><head><title>${t("it.handout.title")}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto;line-height:1.5;white-space:pre-wrap;font-size:14px;}</style>
      </head><body>${escaped}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const card = dark
    ? "bg-slate-800 rounded-xl p-3 space-y-2 border border-slate-700"
    : "bg-teal-50/80 rounded-2xl border border-teal-100 p-4 space-y-3";
  const label = dark ? "text-xs font-semibold text-slate-300" : "text-xs font-semibold text-teal-900";
  const preview = dark
    ? "bg-slate-900 border border-slate-700 rounded-lg p-3 text-[11px] text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto"
    : "bg-white border border-teal-100 rounded-xl p-3 text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto";
  const btn = dark
    ? "flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40"
    : "flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-lg bg-white border border-teal-200 hover:bg-teal-50 text-teal-800 disabled:opacity-40";

  return (
    <div className={card}>
      <p className={`${label} flex items-center gap-1.5`}>
        <FileDown size={13} className="text-teal-500" />
        {t("it.handout.title")}
      </p>
      <p className={dark ? "text-[10px] text-slate-500" : "text-[10px] text-teal-700/80"}>
        {t("it.handout.subtitle")}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => setShowPreview((s) => !s)}
          className={btn}
        >
          {t("it.handout.preview")}
        </button>
        <button type="button" disabled={!canGenerate} onClick={() => void copyText()} className={btn}>
          {copied ? (
            <>
              <CheckCircle2 size={12} /> {t("it.handout.copied")}
            </>
          ) : (
            <>
              <Copy size={12} /> {t("it.handout.copy")}
            </>
          )}
        </button>
        <button type="button" disabled={!canGenerate} onClick={printHandout} className={btn}>
          <Printer size={12} /> {t("it.handout.print")}
        </button>
      </div>

      {showPreview && handout && <div className={preview}>{handout}</div>}
    </div>
  );
}
