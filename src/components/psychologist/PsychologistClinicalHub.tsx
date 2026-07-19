"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  FileText,
  NotebookPen,
  Scale,
  Share2,
  ShieldCheck,
  ChevronDown,
  Plus,
  Pin,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type PsychologistHubSectionId =
  | "anamnesis"
  | "timeline"
  | "session_notes"
  | "scales"
  | "cfp_docs"
  | "patient_shared"
  | "audit";

type SectionTone = {
  shell: string;
  iconWrap: string;
  icon: string;
  title: string;
  cta: string;
  ring: string;
};

const TONES: Record<PsychologistHubSectionId, SectionTone> = {
  anamnesis: {
    shell: "bg-gradient-to-r from-violet-50 via-purple-50/70 to-violet-50 border-violet-200",
    iconWrap: "bg-violet-500/15",
    icon: "text-violet-700",
    title: "text-violet-800",
    cta: "bg-violet-600 hover:bg-violet-700 text-white",
    ring: "ring-violet-200",
  },
  timeline: {
    shell: "bg-gradient-to-r from-slate-50 via-slate-100/80 to-slate-50 border-slate-200",
    iconWrap: "bg-slate-500/10",
    icon: "text-slate-600",
    title: "text-slate-700",
    cta: "bg-slate-700 hover:bg-slate-800 text-white",
    ring: "ring-slate-200",
  },
  session_notes: {
    shell: "bg-gradient-to-r from-indigo-50 via-blue-50/60 to-indigo-50 border-indigo-200",
    iconWrap: "bg-indigo-500/15",
    icon: "text-indigo-700",
    title: "text-indigo-800",
    cta: "bg-indigo-600 hover:bg-indigo-700 text-white",
    ring: "ring-indigo-200",
  },
  scales: {
    shell: "bg-gradient-to-r from-fuchsia-50 via-pink-50/50 to-fuchsia-50 border-fuchsia-200",
    iconWrap: "bg-fuchsia-500/15",
    icon: "text-fuchsia-700",
    title: "text-fuchsia-800",
    cta: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
    ring: "ring-fuchsia-200",
  },
  cfp_docs: {
    shell: "bg-gradient-to-r from-teal-50 via-emerald-50/50 to-teal-50 border-teal-200",
    iconWrap: "bg-teal-500/15",
    icon: "text-teal-700",
    title: "text-teal-800",
    cta: "bg-teal-600 hover:bg-teal-700 text-white",
    ring: "ring-teal-200",
  },
  patient_shared: {
    shell: "bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border-amber-200",
    iconWrap: "bg-amber-500/15",
    icon: "text-amber-700",
    title: "text-amber-800",
    cta: "bg-amber-600 hover:bg-amber-700 text-white",
    ring: "ring-amber-200",
  },
  audit: {
    shell: "bg-gradient-to-r from-stone-50 via-neutral-50 to-stone-50 border-stone-200",
    iconWrap: "bg-stone-500/15",
    icon: "text-stone-700",
    title: "text-stone-800",
    cta: "bg-stone-700 hover:bg-stone-800 text-white",
    ring: "ring-stone-200",
  },
};

const SECTION_META: {
  id: PsychologistHubSectionId;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  { id: "anamnesis", icon: FileText, titleKey: "psy.mod.anamnesis.title", descKey: "psychHub.desc.anamnesis" },
  { id: "timeline", icon: Clock, titleKey: "chartTab.activity", descKey: "psychHub.desc.timeline" },
  { id: "session_notes", icon: NotebookPen, titleKey: "psy.mod.sessions.title", descKey: "psychHub.desc.session_notes" },
  { id: "scales", icon: Scale, titleKey: "psy.mod.scales.title", descKey: "psychHub.desc.scales" },
  { id: "cfp_docs", icon: ClipboardList, titleKey: "psy.mod.documents.title", descKey: "psychHub.desc.cfp_docs" },
  { id: "patient_shared", icon: Share2, titleKey: "timeline.filter.patient_shared", descKey: "psychHub.desc.patient_shared" },
  { id: "audit", icon: ShieldCheck, titleKey: "psychHub.audit", descKey: "psychHub.desc.audit" },
];

export function tabToPsychologistHubSection(tab: string | null | undefined): PsychologistHubSectionId | null {
  switch (tab) {
    case "activity":
      return "timeline";
    case "records":
      return "anamnesis";
    default:
      return null;
  }
}

type Cta =
  | { kind: "button"; label: string; onClick: () => void }
  | { kind: "link"; label: string; href: string }
  | null;

export default function PsychologistClinicalHub({
  openId,
  onOpenChange,
  panels,
  headerExtras,
}: {
  openId: PsychologistHubSectionId | null;
  onOpenChange: (id: PsychologistHubSectionId | null) => void;
  panels: Partial<Record<PsychologistHubSectionId, ReactNode>>;
  headerExtras?: Partial<
    Record<PsychologistHubSectionId, { cta?: Cta; badge?: ReactNode; description?: string | null }>
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
            id={`psych-hub-${section.id}`}
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
                  <p className={`text-xs font-bold uppercase tracking-wide ${tone.title} inline-flex items-center gap-1.5 flex-wrap`}>
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
