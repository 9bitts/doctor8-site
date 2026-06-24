"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Brain, Users, Calendar, Video, FileText, ClipboardList,
  BarChart3, Shield, ArrowRight, MessageSquare, BookOpen,
} from "lucide-react";

const MODULES = [
  { href: "/professional/psychology/sessions", icon: ClipboardList, color: "bg-violet-100 text-violet-600", key: "psy.mod.sessions" },
  { href: "/professional/psychology/scales", icon: BarChart3, color: "bg-indigo-100 text-indigo-600", key: "psy.mod.scales" },
  { href: "/professional/psychology/documents", icon: FileText, color: "bg-sky-100 text-sky-600", key: "psy.mod.documents" },
  { href: "/professional/psychology/compliance", icon: Shield, color: "bg-emerald-100 text-emerald-600", key: "psy.mod.compliance" },
] as const;

const INTEGRATIONS = [
  { href: "/professional/patients", icon: Users, key: "psy.link.patients" },
  { href: "/professional/appointments", icon: Calendar, key: "psy.link.appointments" },
  { href: "/professional/messages", icon: MessageSquare, key: "psy.link.messages" },
  { href: "/professional/resources", icon: BookOpen, key: "psy.link.resources" },
] as const;

export default function PsychologyHubPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
          <Brain size={28} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{t("psy.hub.title")}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">{t("psy.hub.subtitle")}</p>
        </div>
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
        <p className="text-sm text-violet-800 leading-relaxed">{t("psy.hub.cfpBanner")}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("psy.hub.modulesTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-violet-200 hover:shadow-sm transition flex items-start gap-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                <m.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 group-hover:text-violet-700 transition">
                  {t(`${m.key}.title`)}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{t(`${m.key}.desc`)}</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-violet-400 mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {t("psy.hub.integrationsTitle")}
        </h2>
        <p className="text-sm text-slate-500 mb-3">{t("psy.hub.integrationsDesc")}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INTEGRATIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-brand-200 transition text-sm font-medium text-slate-700"
            >
              <item.icon size={18} className="text-brand-500 shrink-0" />
              {t(item.key)}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <Video size={20} className="text-brand-500" />
          <h3 className="font-semibold text-slate-900">{t("psy.hub.teleTitle")}</h3>
        </div>
        <p className="text-sm text-slate-500">{t("psy.hub.teleDesc")}</p>
      </section>
    </div>
  );
}
