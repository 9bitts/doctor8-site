"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import PsychologyPlansSection from "@/components/psychologist/PsychologyPlansSection";
import {
  LayoutDashboard, UserCog, Users, ClipboardList, BarChart3, FileText,
  Shield, Inbox, Layers, Calendar, Radio, BookOpen, Heart, TrendingUp,
  MessageSquare, Settings, Sparkles, ChevronRight, CheckCircle2,
} from "lucide-react";

type BenefitItem = {
  href: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  color: string;
};

const BENEFIT_SECTIONS: { titleKey: string; items: BenefitItem[] }[] = [
  {
    titleKey: "psy.doctorConnection.section.clinical",
    items: [
      { href: "/psychologist/sessions", icon: ClipboardList, titleKey: "psy.mod.sessions.title", descKey: "psy.doctorConnection.sessions", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/anamnesis", icon: ClipboardList, titleKey: "psy.mod.anamnesis.title", descKey: "psy.doctorConnection.anamnesis", color: "bg-fuchsia-100 text-fuchsia-600" },
      { href: "/psychologist/chart-chat", icon: MessageSquare, titleKey: "psy.mod.chartChat.title", descKey: "psy.doctorConnection.chartChat", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/scales", icon: BarChart3, titleKey: "psy.mod.scales.title", descKey: "psy.doctorConnection.scales", color: "bg-indigo-100 text-indigo-600" },
      { href: "/psychologist/documents", icon: FileText, titleKey: "psy.mod.documents.title", descKey: "psy.doctorConnection.documents", color: "bg-sky-100 text-sky-600" },
      { href: "/psychologist/compliance", icon: Shield, titleKey: "psy.mod.compliance.title", descKey: "psy.doctorConnection.compliance", color: "bg-emerald-100 text-emerald-600" },
      { href: "/psychologist/patients", icon: Users, titleKey: "nav.patients", descKey: "psy.doctorConnection.patients", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/categories", icon: Layers, titleKey: "nav.categories", descKey: "psy.doctorConnection.categories", color: "bg-slate-100 text-slate-600" },
      { href: "/psychologist/shared", icon: Inbox, titleKey: "nav.sharedWithMe", descKey: "psy.doctorConnection.shared", color: "bg-amber-100 text-amber-700" },
    ],
  },
  {
    titleKey: "psy.doctorConnection.section.attend",
    items: [
      { href: "/psychologist/appointments", icon: Calendar, titleKey: "nav.appointments", descKey: "psy.doctorConnection.appointments", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/jit", icon: Radio, titleKey: "nav.jit", descKey: "psy.doctorConnection.jit", color: "bg-brand-50 text-brand-600" },
      { href: "/psychologist/settings/availability", icon: Calendar, titleKey: "nav.availability", descKey: "psy.doctorConnection.availability", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/settings/calendar", icon: Calendar, titleKey: "psy.gcal.title", descKey: "psy.doctorConnection.gcal", color: "bg-sky-100 text-sky-600" },
      { href: "/psychologist/messages", icon: MessageSquare, titleKey: "nav.messages", descKey: "psy.doctorConnection.messages", color: "bg-slate-100 text-slate-600" },
    ],
  },
  {
    titleKey: "psy.doctorConnection.section.grow",
    items: [
      { href: "/psychologist", icon: LayoutDashboard, titleKey: "nav.dashboard", descKey: "psy.doctorConnection.dashboard", color: "bg-violet-100 text-violet-600" },
      { href: "/psychologist/settings", icon: UserCog, titleKey: "nav.myProfile", descKey: "psy.doctorConnection.profile", color: "bg-orange-100 text-orange-700" },
      { href: "/psychologist/financeiro", icon: TrendingUp, titleKey: "nav.financeiro", descKey: "psy.doctorConnection.financeiro", color: "bg-emerald-100 text-emerald-600" },
      { href: "/psychologist/resources", icon: BookOpen, titleKey: "nav.library", descKey: "psy.doctorConnection.resources", color: "bg-sky-100 text-sky-600" },
      { href: "/humanitarian/volunteer", icon: Heart, titleKey: "nav.humanitarianVolunteer", descKey: "psy.doctorConnection.humanitarian", color: "bg-rose-100 text-rose-600" },
      { href: "/psychologist/account", icon: Settings, titleKey: "nav.account", descKey: "psy.doctorConnection.account", color: "bg-zinc-100 text-zinc-600" },
    ],
  },
];

const PLAN_FEATURES = [
  "psy.doctorConnection.plan.unlimited",
  "psy.doctorConnection.plan.tele",
  "psy.doctorConnection.plan.records",
  "psy.doctorConnection.plan.expert",
  "psy.doctorConnection.plan.payments",
  "psy.doctorConnection.plan.support",
] as const;

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
  patientCount?: number;
};

export default function PsychologistDoctorConnectionClient({ subscribed, defaultRegion, patientCount = 0 }: Props) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <Sparkles size={28} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("nav.doctorConnection")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("psy.doctorConnection.subtitle")}</p>
        </div>
      </div>

      {subscribed && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">{t("psy.doctorConnection.activeTitle")}</p>
            <p className="text-sm text-emerald-800 mt-1">{t("psy.doctorConnection.activeDesc")}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900">{t("psy.doctorConnection.planTitle")}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{t("psy.doctorConnection.planDesc")}</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {PLAN_FEATURES.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 size={16} className="text-violet-500 shrink-0 mt-0.5" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      <PsychologyPlansSection subscribed={subscribed} patientCount={patientCount} />

      <DoctorConnectionBanner
        subscribed={subscribed}
        defaultRegion={defaultRegion}
        accountHref="/psychologist/account"
      />

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{t("psy.doctorConnection.guideTitle")}</h2>
        <p className="text-sm text-slate-500 mb-6">{t("psy.doctorConnection.guideDesc")}</p>

        <div className="space-y-8">
          {BENEFIT_SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {t(section.titleKey)}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-4 bg-white rounded-2xl border border-slate-200 p-5 hover:border-violet-200 hover:shadow-sm transition"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-violet-700 transition">
                        {t(item.titleKey)}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{t(item.descKey)}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-400 shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-violet-50 border border-violet-100 rounded-2xl p-6">
        <h3 className="font-semibold text-violet-900">{t("psy.doctorConnection.tipTitle")}</h3>
        <p className="text-sm text-violet-800 mt-2 leading-relaxed">{t("psy.doctorConnection.tipDesc")}</p>
      </section>
    </div>
  );
}
