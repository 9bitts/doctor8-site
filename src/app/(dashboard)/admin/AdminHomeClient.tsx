"use client";

import Link from "next/link";
import {
  Layers, Stethoscope, Users, CreditCard, Radio, Heart, ShoppingBag, Plug, ScrollText, PieChart,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const LINKS = [
  { href: "/admin/integrations", labelKey: "nav.adminIntegrations", icon: Plug },
  { href: "/admin/audit", labelKey: "nav.adminAudit", icon: ScrollText },
  { href: "/admin/rateio", labelKey: "nav.adminRateio", icon: PieChart },
  { href: "/admin/payments", labelKey: "nav.adminPayments", icon: CreditCard },
  { href: "/admin/humanitarian", labelKey: "nav.adminHumanitarian", icon: Heart },
  { href: "/admin/doctors", labelKey: "nav.adminDoctors", icon: Stethoscope },
  { href: "/admin/patients", labelKey: "nav.adminPatients", icon: Users },
  { href: "/admin/categories", labelKey: "nav.adminCategories", icon: Layers },
  { href: "/admin/jit-events", labelKey: "nav.adminJitEvents", icon: Radio },
  { href: "/admin/buying-clubs", labelKey: "nav.adminBuyingClubs", icon: ShoppingBag },
] as const;

export default function AdminHomeClient() {
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.home.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.home.subtitle")}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:border-brand-300 hover:bg-brand-50/40 transition"
          >
            <item.icon size={20} className="text-brand-500 shrink-0" />
            <span className="font-semibold text-slate-800 text-sm">{t(item.labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
