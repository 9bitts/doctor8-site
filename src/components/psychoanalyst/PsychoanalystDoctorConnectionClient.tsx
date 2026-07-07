"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import {
  LayoutDashboard, UserCog, Users, Calendar, BookOpen, Heart, Video,
  Settings, Sparkles, ChevronRight, CheckCircle2, Brain, FileText, TrendingUp,
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
    titleKey: "pa.doctorConnection.section.clinical",
    items: [
      { href: "/psychoanalyst/analysands", icon: Users, titleKey: "pa.nav.analysands", descKey: "pa.doctorConnection.analysands", color: "bg-violet-100 text-violet-600" },
      { href: "/psychoanalyst/analysands", icon: FileText, titleKey: "pa.sessions.title", descKey: "pa.doctorConnection.sessions", color: "bg-indigo-100 text-indigo-600" },
      { href: "/psychoanalyst/resources", icon: BookOpen, titleKey: "nav.library", descKey: "pa.doctorConnection.resources", color: "bg-sky-100 text-sky-600" },
      { href: "/psychoanalyst/freud", icon: Brain, titleKey: "pa.freud.nav", descKey: "pa.doctorConnection.freud", color: "bg-amber-100 text-amber-700" },
    ],
  },
  {
    titleKey: "pa.doctorConnection.section.attend",
    items: [
      { href: "/psychoanalyst/appointments", icon: Calendar, titleKey: "nav.appointments", descKey: "pa.doctorConnection.appointments", color: "bg-violet-100 text-violet-600" },
      { href: "/psychoanalyst/settings/availability", icon: Video, titleKey: "nav.availability", descKey: "pa.doctorConnection.availability", color: "bg-violet-100 text-violet-600" },
    ],
  },
  {
    titleKey: "pa.doctorConnection.section.grow",
    items: [
      { href: "/psychoanalyst", icon: LayoutDashboard, titleKey: "nav.dashboard", descKey: "pa.doctorConnection.dashboard", color: "bg-violet-100 text-violet-600" },
      { href: "/psychoanalyst/settings", icon: UserCog, titleKey: "nav.myProfile", descKey: "pa.doctorConnection.profile", color: "bg-orange-100 text-orange-700" },
      { href: "/psychoanalyst/financeiro", icon: TrendingUp, titleKey: "nav.financeiro", descKey: "pa.doctorConnection.financeiro", color: "bg-emerald-100 text-emerald-600" },
      { href: "/humanitarian/volunteer", icon: Heart, titleKey: "nav.humanitarianVolunteer", descKey: "pa.doctorConnection.humanitarian", color: "bg-rose-100 text-rose-600" },
      { href: "/psychoanalyst/account", icon: Settings, titleKey: "nav.account", descKey: "pa.doctorConnection.account", color: "bg-zinc-100 text-zinc-600" },
    ],
  },
];

const PLAN_FEATURES = [
  "pa.doctorConnection.plan.unlimited",
  "pa.doctorConnection.plan.tele",
  "pa.doctorConnection.plan.analysands",
  "pa.doctorConnection.plan.expert",
  "pa.doctorConnection.plan.ai",
  "pa.doctorConnection.plan.support",
  "pa.doctorConnection.plan.courses",
] as const;

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
};

export default function PsychoanalystDoctorConnectionClient({ subscribed, defaultRegion }: Props) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <Sparkles size={28} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("nav.doctorConnection")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("pa.doctorConnection.subtitle")}</p>
        </div>
      </div>

      {subscribed && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">{t("pa.doctorConnection.activeTitle")}</p>
            <p className="text-sm text-emerald-800 mt-1">{t("pa.doctorConnection.activeDesc")}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900">{t("pa.doctorConnection.planTitle")}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{t("pa.doctorConnection.planDesc")}</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {PLAN_FEATURES.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 size={16} className="text-violet-500 shrink-0 mt-0.5" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      <DoctorConnectionBanner
        subscribed={subscribed}
        defaultRegion={defaultRegion}
        accountHref="/psychoanalyst/account"
      />

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{t("pa.doctorConnection.guideTitle")}</h2>
        <p className="text-sm text-slate-500 mb-6">{t("pa.doctorConnection.guideDesc")}</p>

        <div className="space-y-8">
          {BENEFIT_SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {t(section.titleKey)}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <Link
                    key={item.href + item.titleKey}
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
        <h3 className="font-semibold text-violet-900">{t("pa.doctorConnection.tipTitle")}</h3>
        <p className="text-sm text-violet-800 mt-2 leading-relaxed">{t("pa.doctorConnection.tipDesc")}</p>
      </section>
    </div>
  );
}
