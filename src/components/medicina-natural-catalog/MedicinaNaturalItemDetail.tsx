"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BookOpen, Stethoscope } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import type { NaturalMedicinePracticeConfig } from "@/lib/natural-medicine/config";
import type { DetalhesFitoterapico, FonteReferencia } from "@/lib/medicina-natural/item-types";

type DetalhesFloral = {
  sistema?: string;
  grupoEmocional?: string;
  estadoNegativo?: string;
  estadoPositivo?: string;
};

function floralCategoryLabel(
  sistema: string | undefined,
  t: (key: string) => string,
): string | null {
  if (!sistema) return null;
  const key = `fl.cat.${sistema}`;
  const label = t(key);
  return label === key ? sistema : label;
}
import {
  acaoPrescricaoMedicinaNatural,
  labelAcaoPrescricao,
} from "@/lib/medicina-natural/prescribability";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";
import {
  detectMnCatalogPortal,
  mnCatalogBasePath,
  prescriptionsBasePath,
} from "@/lib/medicina-natural-catalog/portal-config";
import { fetchMedicinaNaturalBySlug } from "@/lib/medicina-natural-catalog/api";
import type { MedicinaNaturalDetailItem } from "@/lib/medicina-natural-catalog/api";
import StatusRegulatorioBadge from "./StatusRegulatorioBadge";

interface MedicinaNaturalItemDetailProps {
  practice: NaturalMedicinePracticeConfig;
  slug: string;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <h2 className="px-5 py-3.5 text-sm font-semibold text-emerald-800 bg-emerald-50/80 border-b border-emerald-100">
        {title}
      </h2>
      <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </section>
  );
}

export default function MedicinaNaturalItemDetail({
  practice,
  slug,
}: MedicinaNaturalItemDetailProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const portal = detectMnCatalogPortal(pathname);
  const base = mnCatalogBasePath(portal);
  const practiceBase = `${base}/${practice.urlSlug}`;

  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [item, setItem] = useState<MedicinaNaturalDetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchMedicinaNaturalBySlug(portal, slug);
      if (!cancelled) {
        setItem(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portal, slug]);

  if (loading) {
    return (
      <p className="text-center text-sm text-slate-400 py-16">{t("nm.catalog.loading")}</p>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-slate-500">{t("nm.detail.notFound")}</p>
        <Link
          href={href(`${practiceBase}/catalogo`)}
          className="text-emerald-600 font-semibold text-sm mt-4 inline-block"
        >
          {t("nm.catalog.back")}
        </Link>
      </div>
    );
  }

  const status = item.statusRegulatorio as StatusRegulatorio;
  const detalhes = (item.detalhesEspecificos || {}) as DetalhesFitoterapico & DetalhesFloral;
  const fontes = (Array.isArray(item.fontes) ? item.fontes : []) as FonteReferencia[];
  const canPrescribeFitoterapico =
    practice.id === "fitoterapia" &&
    (portal === "professional" || portal === "integrative-therapist");
  const canPrescribeFloral =
    practice.id === "terapia_florais" && portal === "integrative-therapist";

  const prescribeHref = canPrescribeFitoterapico
    ? `${prescriptionsBasePath(portal)}?add=phytotherapy&mnSlug=${encodeURIComponent(item.slug)}`
    : canPrescribeFloral
      ? `${prescriptionsBasePath(portal)}?add=floral&mnSlug=${encodeURIComponent(item.slug)}`
      : null;

  const acao = acaoPrescricaoMedicinaNatural(status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link
        href={href(`${practiceBase}/catalogo`)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
      >
        <ArrowLeft size={16} /> {t("nm.catalog.back")}
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 border-t-4 border-t-emerald-500">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t(practice.hubTitleKey)}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">{item.nome}</h1>
        {item.nomeCientifico && (
          <p className="text-slate-500 italic mt-1">{item.nomeCientifico}</p>
        )}
        {item.nomesAlternativos.length > 0 && (
          <p className="text-sm text-slate-500 mt-2">
            <span className="font-semibold text-slate-600">{t("nm.detail.synonyms")}: </span>
            {item.nomesAlternativos.join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <StatusRegulatorioBadge status={status} />
          {item.renisus && (
            <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
              {t("nm.badge.renisus")}
            </span>
          )}
        </div>
      </header>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-xs text-amber-900 leading-relaxed">{t("nm.ref.disclaimer")}</p>
      </div>

      <div className="space-y-4">
        <Section title={t("nm.detail.indicacoes")}>{item.indicacoes}</Section>
        <Section title={t("nm.detail.posologia")}>
          {item.posologia}
          {item.viaAdministracao.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              <span className="font-semibold">{t("nm.detail.vias")}: </span>
              {item.viaAdministracao.join(", ")}
            </p>
          )}
        </Section>
        {item.contraindicacoes.trim() && (
          <Section title={t("nm.detail.contraindicacoes")}>{item.contraindicacoes}</Section>
        )}
        {item.precaucoes.trim() && (
          <Section title={t("nm.detail.precaucoes")}>{item.precaucoes}</Section>
        )}
        {item.alertaGestacaoPediatria?.trim() && (
          <Section title={t("nm.detail.gestacaoPediatria")}>
            {item.alertaGestacaoPediatria}
          </Section>
        )}
        {item.interacoesMedicamentosas?.trim() && (
          <Section title={t("nm.detail.interacoes")}>{item.interacoesMedicamentosas}</Section>
        )}
        {(detalhes.modoPreparo || detalhes.parteUtilizada || detalhes.efeitosAdversos) && (
          <Section title={t("nm.detail.especificos")}>
            {detalhes.parteUtilizada && (
              <p>
                <span className="font-semibold">{t("nm.detail.parteUtilizada")}: </span>
                {detalhes.parteUtilizada}
              </p>
            )}
            {detalhes.modoPreparo && (
              <p className={detalhes.parteUtilizada ? "mt-2" : ""}>
                <span className="font-semibold">{t("nm.detail.modoPreparo")}: </span>
                {detalhes.modoPreparo}
              </p>
            )}
            {detalhes.efeitosAdversos && (
              <p className="mt-2">
                <span className="font-semibold">{t("nm.detail.efeitosAdversos")}: </span>
                {detalhes.efeitosAdversos}
              </p>
            )}
            {detalhes.formaFarmaceutica && detalhes.formaFarmaceutica.length > 0 && (
              <p className="mt-2">
                <span className="font-semibold">{t("nm.detail.formas")}: </span>
                {detalhes.formaFarmaceutica.join(", ")}
              </p>
            )}
          </Section>
        )}
        {(detalhes.sistema ||
          detalhes.grupoEmocional ||
          detalhes.estadoNegativo ||
          detalhes.estadoPositivo) && (
          <Section title={t("nm.detail.especificos")}>
            {detalhes.sistema && (
              <p>
                <span className="font-semibold">{t("nm.detail.sistema")}: </span>
                {floralCategoryLabel(detalhes.sistema, t) ?? detalhes.sistema}
              </p>
            )}
            {detalhes.grupoEmocional && (
              <p className={detalhes.sistema ? "mt-2" : ""}>
                <span className="font-semibold">{t("nm.detail.grupoEmocional")}: </span>
                {detalhes.grupoEmocional}
              </p>
            )}
            {detalhes.estadoNegativo && (
              <p className="mt-2">
                <span className="font-semibold">{t("nm.detail.estadoNegativo")}: </span>
                {detalhes.estadoNegativo}
              </p>
            )}
            {detalhes.estadoPositivo && (
              <p className="mt-2">
                <span className="font-semibold">{t("nm.detail.estadoPositivo")}: </span>
                → {detalhes.estadoPositivo}
              </p>
            )}
          </Section>
        )}
        {fontes.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <h2 className="px-5 py-3.5 text-sm font-semibold text-emerald-800 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
              <BookOpen size={16} /> {t("nm.detail.fontes")}
            </h2>
            <ul className="px-5 py-4 space-y-2">
              {fontes.map((f, i) => (
                <li key={`${f.fonte}-${i}`} className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{f.fonte}</span>
                  {f.edicao && <span> — {f.edicao}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {prescribeHref && (
        <Link
          href={href(prescribeHref)}
          className={`inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-xl shadow-md transition ${
            acao === "prescrever"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
              : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
          }`}
        >
          <Stethoscope size={16} />
          {labelAcaoPrescricao(status, t)}
        </Link>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {t("nm.ref.sources")}
      </p>
    </div>
  );
}
