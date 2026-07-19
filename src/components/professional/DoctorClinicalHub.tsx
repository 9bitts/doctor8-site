"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Activity,
  Clock,
  Ear,
  FileCheck,
  FileText,
  FlaskConical,
  Grid3X3,
  LineChart,
  Pill,
  Share2,
  Stethoscope,
  Syringe,
  ChevronDown,
  Plus,
  Pin,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type DoctorHubSectionId =
  | "anamnesis"
  | "timeline"
  | "prescriptions"
  | "exams"
  | "documents"
  | "patient_shared"
  | "vitals"
  | "diagnoses"
  | "vaccines"
  | "growth"
  | "dental"
  | "audio";

type SectionTone = {
  shell: string;
  iconWrap: string;
  icon: string;
  title: string;
  cta: string;
  ring: string;
};

const TONES: Record<DoctorHubSectionId, SectionTone> = {
  anamnesis: {
    shell: "bg-gradient-to-r from-accent-50 via-orange-50 to-accent-50 border-accent-200",
    iconWrap: "bg-accent-500/15",
    icon: "text-accent-600",
    title: "text-accent-700",
    cta: "bg-accent-500 hover:bg-accent-600 text-white",
    ring: "ring-accent-200",
  },
  timeline: {
    shell: "bg-gradient-to-r from-slate-50 via-slate-100/80 to-slate-50 border-slate-200",
    iconWrap: "bg-slate-500/10",
    icon: "text-slate-600",
    title: "text-slate-700",
    cta: "bg-slate-700 hover:bg-slate-800 text-white",
    ring: "ring-slate-200",
  },
  prescriptions: {
    shell: "bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50 border-emerald-200",
    iconWrap: "bg-emerald-500/15",
    icon: "text-emerald-700",
    title: "text-emerald-800",
    cta: "bg-emerald-600 hover:bg-emerald-700 text-white",
    ring: "ring-emerald-200",
  },
  exams: {
    shell: "bg-gradient-to-r from-cyan-50 via-sky-50/80 to-cyan-50 border-cyan-200",
    iconWrap: "bg-cyan-500/15",
    icon: "text-cyan-700",
    title: "text-cyan-800",
    cta: "bg-cyan-600 hover:bg-cyan-700 text-white",
    ring: "ring-cyan-200",
  },
  documents: {
    shell: "bg-gradient-to-r from-indigo-50 via-blue-50/60 to-indigo-50 border-indigo-200",
    iconWrap: "bg-indigo-500/15",
    icon: "text-indigo-700",
    title: "text-indigo-800",
    cta: "bg-indigo-600 hover:bg-indigo-700 text-white",
    ring: "ring-indigo-200",
  },
  patient_shared: {
    shell: "bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border-amber-200",
    iconWrap: "bg-amber-500/15",
    icon: "text-amber-700",
    title: "text-amber-800",
    cta: "bg-amber-600 hover:bg-amber-700 text-white",
    ring: "ring-amber-200",
  },
  vitals: {
    shell: "bg-gradient-to-r from-sky-50 via-cyan-50/70 to-sky-50 border-sky-200",
    iconWrap: "bg-sky-500/15",
    icon: "text-sky-700",
    title: "text-sky-800",
    cta: "bg-sky-600 hover:bg-sky-700 text-white",
    ring: "ring-sky-200",
  },
  diagnoses: {
    shell: "bg-gradient-to-r from-rose-50 via-pink-50/60 to-rose-50 border-rose-200",
    iconWrap: "bg-rose-500/15",
    icon: "text-rose-700",
    title: "text-rose-800",
    cta: "bg-rose-600 hover:bg-rose-700 text-white",
    ring: "ring-rose-200",
  },
  vaccines: {
    shell: "bg-gradient-to-r from-green-50 via-lime-50/50 to-green-50 border-green-200",
    iconWrap: "bg-green-500/15",
    icon: "text-green-700",
    title: "text-green-800",
    cta: "bg-green-600 hover:bg-green-700 text-white",
    ring: "ring-green-200",
  },
  growth: {
    shell: "bg-gradient-to-r from-teal-50 via-emerald-50/50 to-teal-50 border-teal-200",
    iconWrap: "bg-teal-500/15",
    icon: "text-teal-700",
    title: "text-teal-800",
    cta: "bg-teal-600 hover:bg-teal-700 text-white",
    ring: "ring-teal-200",
  },
  dental: {
    shell: "bg-gradient-to-r from-fuchsia-50 via-pink-50/50 to-fuchsia-50 border-fuchsia-200",
    iconWrap: "bg-fuchsia-500/15",
    icon: "text-fuchsia-700",
    title: "text-fuchsia-800",
    cta: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
    ring: "ring-fuchsia-200",
  },
  audio: {
    shell: "bg-gradient-to-r from-violet-50 via-purple-50/40 to-violet-50 border-violet-200",
    iconWrap: "bg-violet-500/15",
    icon: "text-violet-700",
    title: "text-violet-800",
    cta: "bg-violet-600 hover:bg-violet-700 text-white",
    ring: "ring-violet-200",
  },
};

const SECTION_META: {
  id: DoctorHubSectionId;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  { id: "anamnesis", icon: FileText, titleKey: "chart.anamnesisTerm", descKey: "doctorHub.desc.anamnesis" },
  { id: "timeline", icon: Clock, titleKey: "chartTab.activity", descKey: "doctorHub.desc.timeline" },
  { id: "prescriptions", icon: Pill, titleKey: "timeline.filter.prescription", descKey: "doctorHub.desc.prescriptions" },
  { id: "exams", icon: FlaskConical, titleKey: "timeline.filter.exam", descKey: "doctorHub.desc.exams" },
  { id: "documents", icon: FileCheck, titleKey: "doctorHub.documents", descKey: "doctorHub.desc.documents" },
  { id: "patient_shared", icon: Share2, titleKey: "timeline.filter.patient_shared", descKey: "doctorHub.desc.patient_shared" },
  { id: "vitals", icon: Activity, titleKey: "chartTab.evolution", descKey: "doctorHub.desc.vitals" },
  { id: "diagnoses", icon: Stethoscope, titleKey: "chartTab.diagnoses", descKey: "doctorHub.desc.diagnoses" },
  { id: "vaccines", icon: Syringe, titleKey: "chartTab.vaccines", descKey: "doctorHub.desc.vaccines" },
  { id: "growth", icon: LineChart, titleKey: "chartTab.growth", descKey: "doctorHub.desc.growth" },
  { id: "dental", icon: Grid3X3, titleKey: "chartTab.dental", descKey: "doctorHub.desc.dental" },
  { id: "audio", icon: Ear, titleKey: "chartTab.audio", descKey: "doctorHub.desc.audio" },
];

export const DOCTOR_HUB_SECTION_IDS = SECTION_META.map((s) => s.id);

export function tabToDoctorHubSection(tab: string | null | undefined): DoctorHubSectionId | null {
  switch (tab) {
    case "activity":
      return "timeline";
    case "records":
      return "anamnesis";
    case "evolution":
      return "vitals";
    case "diagnoses":
      return "diagnoses";
    case "vaccines":
      return "vaccines";
    case "growth":
      return "growth";
    case "dental":
      return "dental";
    case "audio":
      return "audio";
    default:
      return null;
  }
}

type Cta =
  | { kind: "button"; label: string; onClick: () => void }
  | { kind: "link"; label: string; href: string }
  | null;

export default function DoctorClinicalHub({
  openId,
  onOpenChange,
  panels,
  headerExtras,
}: {
  openId: DoctorHubSectionId | null;
  onOpenChange: (id: DoctorHubSectionId | null) => void;
  panels: Partial<Record<DoctorHubSectionId, ReactNode>>;
  /** Optional CTAs / badges rendered in the collapsed header row (right side). */
  headerExtras?: Partial<
    Record<DoctorHubSectionId, { cta?: Cta; badge?: ReactNode; description?: string | null }>
  >;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {SECTION_META.map((section) => {
        const tone = TONES[section.id];
        const Icon = section.icon;
        const open = openId === section.id;
        const extra = headerExtras?.[section.id];
        const cta = extra?.cta ?? null;
        const desc = open
          ? null
          : extra?.description !== undefined
            ? extra.description
            : t(section.descKey);

        return (
          <div
            key={section.id}
            id={`doctor-hub-${section.id}`}
            className={`border-2 rounded-2xl overflow-hidden transition ${tone.shell} ${
              open ? `ring-2 ${tone.ring}` : ""
            }`}
          >
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(open ? null : section.id)}
                className="flex items-start gap-3 flex-1 min-w-0 text-left"
                aria-expanded={open}
              >
                <div className={`w-10 h-10 rounded-xl ${tone.iconWrap} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={tone.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wide ${tone.title} inline-flex items-center gap-1.5`}>
                    {section.id === "anamnesis" && extra?.badge ? (
                      <Pin size={12} className={tone.icon} aria-hidden />
                    ) : null}
                    {t(section.titleKey)}
                    {extra?.badge}
                  </p>
                  {desc ? (
                    <p className="text-sm text-slate-700 mt-0.5">{desc}</p>
                  ) : null}
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 mt-1 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {cta && !open ? (
                cta.kind === "link" ? (
                  <Link
                    href={cta.href}
                    className={`inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-sm transition shrink-0 ${tone.cta}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus size={16} /> {cta.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cta.onClick();
                    }}
                    className={`inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-sm transition shrink-0 ${tone.cta}`}
                  >
                    <Plus size={16} /> {cta.label}
                  </button>
                )
              ) : null}
            </div>

            {open ? (
              <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3 bg-white/50">
                {cta ? (
                  cta.kind === "link" ? (
                    <Link
                      href={cta.href}
                      className={`inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-sm transition ${tone.cta}`}
                    >
                      <Plus size={16} /> {cta.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={cta.onClick}
                      className={`inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-sm transition ${tone.cta}`}
                    >
                      <Plus size={16} /> {cta.label}
                    </button>
                  )
                ) : null}
                {panels[section.id] ?? (
                  <p className="text-sm text-slate-500">{t("timeline.empty")}</p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
