"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ClipboardList,
  Droplets,
  FileText,
  Flower2,
  Hexagon,
  LayoutTemplate,
  Leaf,
  Library,
  Stethoscope,
  Sprout,
  Users,
  Wind,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  type NaturalMedicinePortal,
  type NaturalMedicinePracticeConfig,
  naturalMedicineBasePath,
} from "@/lib/natural-medicine/config";
import { prescriptionsPathForPractice } from "@/lib/medicina-natural-catalog/practice-prescriptions";

const PRACTICE_ICONS = {
  Leaf,
  Flower2,
  Wind,
  Droplets,
  Hexagon,
  Sprout,
} as const;

interface PicsPracticeHubProps {
  portal: NaturalMedicinePortal;
  practice: NaturalMedicinePracticeConfig;
}

export default function PicsPracticeHub({ portal, practice }: PicsPracticeHubProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = naturalMedicineBasePath(portal);
  const practiceBase = `${base}/${practice.urlSlug}`;

  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const modules =
    portal === "professional"
      ? [
          {
            path: `${practiceBase}/catalogo`,
            icon: Library,
            color: "bg-emerald-100 text-emerald-600",
            key: "nm.mod.catalog",
          },
          {
            path: `${practiceBase}/reference`,
            icon: BookOpen,
            color: "bg-teal-100 text-teal-600",
            key: "nm.mod.reference",
          },
          {
            path: prescriptionsPathForPractice("professional", practice.id),
            icon: Stethoscope,
            color: "bg-emerald-100 text-emerald-600",
            key:
              practice.id === "terapia_florais"
                ? "nm.mod.floralPrescriptions"
                : "nm.mod.prescriptions",
          },
          {
            path: `${practiceBase}/templates`,
            icon: LayoutTemplate,
            color:
              practice.id === "terapia_florais"
                ? "bg-rose-100 text-rose-600"
                : "bg-lime-100 text-lime-700",
            key: "nm.mod.templates",
          },
        ]
      : [
          {
            path: `${practiceBase}/catalogo`,
            icon: Library,
            color: "bg-emerald-100 text-emerald-600",
            key: "nm.mod.catalog",
          },
          {
            path: `${practiceBase}/reference`,
            icon: BookOpen,
            color: "bg-teal-100 text-teal-600",
            key: "nm.mod.reference",
          },
          {
            path: `${practiceBase}/sessions`,
            icon: ClipboardList,
            color: "bg-emerald-100 text-emerald-600",
            key: "nm.mod.sessions",
          },
          {
            path: prescriptionsPathForPractice("integrative", practice.id),
            icon: Stethoscope,
            color:
              practice.id === "terapia_florais"
                ? "bg-pink-100 text-pink-600"
                : "bg-emerald-100 text-emerald-600",
            key:
              practice.id === "terapia_florais"
                ? "nm.mod.floralPrescriptions"
                : "nm.mod.prescriptions",
          },
          {
            path: `${practiceBase}/templates`,
            icon: LayoutTemplate,
            color:
              practice.id === "terapia_florais"
                ? "bg-rose-100 text-rose-600"
                : "bg-lime-100 text-lime-700",
            key: "nm.mod.templates",
          },
          {
            path: "/integrative-therapist/clients",
            icon: Users,
            color: "bg-lime-100 text-lime-700",
            key: "nm.mod.consult",
          },
        ];

  const integrations =
    portal === "professional"
      ? [
          { path: "/professional/patients", icon: Users, key: "nm.link.patients" },
          { path: "/professional/appointments", icon: Calendar, key: "nm.link.appointments" },
          { path: "/professional/resources", icon: FileText, key: "nm.link.resources" },
        ]
      : [
          { path: "/integrative-therapist/appointments", icon: Calendar, key: "nm.link.appointments" },
          { path: "/integrative-therapist/clients", icon: Users, key: "nm.link.clients" },
        ];

  const PracticeIcon = PRACTICE_ICONS[practice.icon];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Link
        href={href(base)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft size={16} />
        {t("nm.practice.backToHub")}
      </Link>

      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${practice.color}`}>
          <PracticeIcon size={28} />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t(practice.hubTitleKey)}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t(practice.hubSubtitleKey)}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-sm text-slate-700 leading-relaxed">{t(practice.bannerKey)}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("nm.practice.modulesTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link
              key={m.path}
              href={href(m.path)}
              className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-sm transition flex items-start gap-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                <m.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                  {t(`${m.key}.title`)}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{t(`${m.key}.desc`)}</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-400 mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("nm.practice.integrationsTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((item) => (
            <Link
              key={item.path}
              href={href(item.path)}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-200 transition text-sm font-medium text-slate-700"
            >
              <item.icon size={18} className="text-emerald-500 shrink-0" />
              {t(item.key)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
