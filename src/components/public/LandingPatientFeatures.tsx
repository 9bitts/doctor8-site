"use client";

import Link from "next/link";
import {
  LayoutDashboard, FileText, Pill, ShoppingBag, Stethoscope, Calendar,
  ClipboardList, MessageSquare, Radio, MapPin, Settings, ChevronRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";

const FEATURES = [
  { key: "dashboard", href: "/patient", icon: LayoutDashboard, color: "bg-accent-500/10 text-accent-600 border-accent-200" },
  { key: "history", href: "/patient/history", icon: FileText, color: "bg-brand-50 text-brand-600 border-brand-200" },
  { key: "medications", href: "/patient/medications", icon: Pill, color: "bg-violet-50 text-violet-600 border-violet-200" },
  { key: "buyingClub", href: "/patient/buying-club", icon: ShoppingBag, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "prescriptions", href: "/patient/prescriptions", icon: Stethoscope, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { key: "appointments", href: "/patient/appointments", icon: Calendar, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { key: "documents", href: "/patient/documents", icon: ClipboardList, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "messages", href: "/patient/messages", icon: MessageSquare, color: "bg-sky-50 text-sky-600 border-sky-200" },
  { key: "urgent", href: "/urgent", icon: Radio, color: "bg-red-50 text-red-600 border-red-200" },
  { key: "find", href: "/patient/find", icon: MapPin, color: "bg-teal-50 text-teal-600 border-teal-200" },
  { key: "account", href: "/patient/account", icon: Settings, color: "bg-d8-off text-d8-text border-d8-border" },
] as const;

export default function LandingPatientFeatures() {
  const { t, lang } = useI18n();
  const c = getLandingContent(lang);

  return (
    <section id="platform" className="bg-d8-off px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-accent-500">
            {c.platform.eyebrow}
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">
            {c.platform.title}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-d8-muted">
            {c.platform.sub}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, href, icon: Icon, color }) => {
            const item = c.platform.items[key];
            const registerHref = `/register?callbackUrl=${encodeURIComponent(href)}`;
            return (
              <Link
                key={key}
                href={registerHref}
                className="group flex gap-4 rounded-2xl border border-d8-border bg-white p-5 shadow-sm transition hover:border-accent-400 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-d8-dark">{t(item.labelKey)}</h3>
                    <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:text-accent-500" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-d8-muted">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-d8-muted">
          {c.platform.footerNote}{" "}
          <Link href="/login" className="font-semibold text-accent-500 hover:text-accent-600">
            {c.platform.loginLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
