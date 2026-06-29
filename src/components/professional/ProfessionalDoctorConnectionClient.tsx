"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DoctorConnectionBanner from "@/components/professional/DoctorConnectionBanner";
import {
  LayoutDashboard, UserCog, Users, Calendar, BookOpen, Heart, Radio,
  Settings, Sparkles, ChevronRight, CheckCircle2, Stethoscope, Inbox,
  Layers, TrendingUp, MessageSquare, ShoppingBag, FlaskConical, Clock,
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
    titleKey: "pro.doctorConnection.section.clinical",
    items: [
      { href: "/professional/patients", icon: Users, titleKey: "nav.patients", descKey: "pro.doctorConnection.patients", color: "bg-brand-50 text-brand-600" },
      { href: "/professional/prescriptions", icon: Stethoscope, titleKey: "nav.prescriptions", descKey: "pro.doctorConnection.prescriptions", color: "bg-accent-50 text-accent-600" },
      { href: "/professional/prescriptions", icon: FlaskConical, titleKey: "pro.doctorConnection.exams", descKey: "pro.doctorConnection.examsDesc", color: "bg-sky-100 text-sky-600" },
      { href: "/professional/categories", icon: Layers, titleKey: "nav.categories", descKey: "pro.doctorConnection.categories", color: "bg-slate-100 text-slate-600" },
      { href: "/professional/shared", icon: Inbox, titleKey: "nav.sharedWithMe", descKey: "pro.doctorConnection.shared", color: "bg-amber-100 text-amber-700" },
      { href: "/professional/resources", icon: BookOpen, titleKey: "nav.library", descKey: "pro.doctorConnection.resources", color: "bg-sky-100 text-sky-600" },
    ],
  },
  {
    titleKey: "pro.doctorConnection.section.attend",
    items: [
      { href: "/professional/appointments", icon: Calendar, titleKey: "nav.appointments", descKey: "pro.doctorConnection.appointments", color: "bg-brand-50 text-brand-600" },
      { href: "/professional/jit", icon: Radio, titleKey: "nav.jit", descKey: "pro.doctorConnection.jit", color: "bg-brand-50 text-brand-600" },
      { href: "/professional/settings/availability", icon: Clock, titleKey: "nav.availability", descKey: "pro.doctorConnection.availability", color: "bg-brand-50 text-brand-600" },
      { href: "/professional/messages", icon: MessageSquare, titleKey: "nav.messages", descKey: "pro.doctorConnection.messages", color: "bg-slate-100 text-slate-600" },
    ],
  },
  {
    titleKey: "pro.doctorConnection.section.grow",
    items: [
      { href: "/professional", icon: LayoutDashboard, titleKey: "nav.dashboard", descKey: "pro.doctorConnection.dashboard", color: "bg-brand-50 text-brand-600" },
      { href: "/professional/settings", icon: UserCog, titleKey: "nav.myProfile", descKey: "pro.doctorConnection.profile", color: "bg-orange-100 text-orange-700" },
      { href: "/professional/financeiro", icon: TrendingUp, titleKey: "nav.financeiro", descKey: "pro.doctorConnection.financeiro", color: "bg-emerald-100 text-emerald-600" },
      { href: "/professional/buying-club", icon: ShoppingBag, titleKey: "nav.buyingClub", descKey: "pro.doctorConnection.buyingClub", color: "bg-amber-100 text-amber-700" },
      { href: "/humanitarian/volunteer", icon: Heart, titleKey: "nav.humanitarianVolunteer", descKey: "pro.doctorConnection.humanitarian", color: "bg-rose-100 text-rose-600" },
      { href: "/professional/account", icon: Settings, titleKey: "nav.account", descKey: "pro.doctorConnection.account", color: "bg-zinc-100 text-zinc-600" },
    ],
  },
];

const PLAN_FEATURES = [
  "pro.doctorConnection.plan.unlimited",
  "pro.doctorConnection.plan.tele",
  "pro.doctorConnection.plan.prescriptions",
  "pro.doctorConnection.plan.records",
  "pro.doctorConnection.plan.expert",
  "pro.doctorConnection.plan.payments",
  "pro.doctorConnection.plan.jit",
  "pro.doctorConnection.plan.support",
] as const;

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
};

export default function ProfessionalDoctorConnectionClient({ subscribed, defaultRegion }: Props) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <DoctorConnectionBanner
        subscribed={subscribed}
        defaultRegion={defaultRegion}
        accountHref="/professional/account"
      />

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
          <Sparkles size={28} className="text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("nav.doctorConnection")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("pro.doctorConnection.subtitle")}</p>
        </div>
      </div>

      {subscribed && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">{t("pro.doctorConnection.activeTitle")}</p>
            <p className="text-sm text-emerald-800 mt-1">{t("pro.doctorConnection.activeDesc")}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900">{t("pro.doctorConnection.planTitle")}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{t("pro.doctorConnection.planDesc")}</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {PLAN_FEATURES.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{t("pro.doctorConnection.guideTitle")}</h2>
        <p className="text-sm text-slate-500 mb-6">{t("pro.doctorConnection.guideDesc")}</p>

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
                    className="group flex items-start gap-4 bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-200 hover:shadow-sm transition"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-brand-600 transition">
                        {t(item.titleKey)}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{t(item.descKey)}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-50 border border-brand-100 rounded-2xl p-6">
        <h3 className="font-semibold text-brand-900">{t("pro.doctorConnection.tipTitle")}</h3>
        <p className="text-sm text-brand-800 mt-2 leading-relaxed">{t("pro.doctorConnection.tipDesc")}</p>
      </section>
    </div>
  );
}
