"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import PlantIngredientCard from "./PlantIngredientCard";
import {
  mtLang,
  mtTeaText,
  mtUiString,
  teaBySlug,
} from "@/lib/medicinal-teas/data";
import {
  detectMedicinalTeasPortal,
  medicinalTeasBasePath,
} from "@/lib/medicinal-teas/portal-config";

export default function MedicinalTeaDetail({ slug }: { slug: string }) {
  const { lang } = useI18n();
  const ml = mtLang(lang);
  const ui = (key: string) => mtUiString(ml, key);
  const pathname = usePathname();
  const portal = detectMedicinalTeasPortal(pathname);
  const base = medicinalTeasBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const tea = teaBySlug(slug);
  const tx = tea ? mtTeaText(ml, slug) : null;

  if (!tea || !tx) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-slate-500">Chá não encontrado.</p>
        <Link href={href(base)} className="text-brand-600 font-semibold text-sm mt-4 inline-block">
          {ui("navBack")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <Link href={href(base)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800">
        <ArrowLeft size={16} /> {ui("navBack")}
      </Link>

      <header
        className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8"
        style={{ borderTopWidth: 4, borderTopColor: tea.accent }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{tx.symptom}</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">{tx.name}</h1>
        <p className="text-slate-600 mt-3 leading-relaxed">{tx.tagline}</p>
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
          <Sun size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">{ui("modoLabel")}</p>
            <p className="text-sm text-amber-900 mt-1 leading-relaxed">{tx.modo}</p>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{ui("scanEyebrow")}</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{ui("ingredientsTitle")}</h2>
          <p className="text-sm text-slate-500 mt-1">{ui("ingredientsHint")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {tea.plants.map((plantId) => (
            <PlantIngredientCard key={plantId} plantId={plantId} accent={tea.accent} lang={ml} ui={ui} />
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {ui("footerDisclaimerShort")}
      </p>
    </div>
  );
}
