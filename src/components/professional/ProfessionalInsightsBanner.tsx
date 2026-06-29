"use client";

import Link from "next/link";
import { Mail, Users, Clock, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ProfessionalDashboardInsights } from "@/lib/professional-dashboard-insights";

export default function ProfessionalInsightsBanner({
  insights,
}: {
  insights: ProfessionalDashboardInsights;
}) {
  const { t } = useI18n();

  const items: { key: string; count: number; href: string; icon: React.ReactNode }[] = [];

  if (insights.chartsNeedingInvite > 0) {
    items.push({
      key: "needsInvite",
      count: insights.chartsNeedingInvite,
      href: "/professional/patients",
      icon: <Mail size={18} className="text-brand-600" />,
    });
  }
  if (insights.staleInvites > 0) {
    items.push({
      key: "staleInvites",
      count: insights.staleInvites,
      href: "/professional/patients",
      icon: <Clock size={18} className="text-amber-600" />,
    });
  }
  if (insights.unlinkedWithEmail > 0 && items.length === 0) {
    items.push({
      key: "unlinked",
      count: insights.unlinkedWithEmail,
      href: "/professional/patients",
      icon: <Users size={18} className="text-slate-600" />,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 space-y-2">
      <p className="text-sm font-semibold text-brand-900">{t("prodash.insights.title")}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-xl bg-white border border-brand-100 px-3 py-2.5 hover:border-brand-200 transition"
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-sm text-slate-700">
                {t(`prodash.insights.${item.key}`).replace("{{count}}", String(item.count))}
              </span>
              <ChevronRight size={16} className="text-brand-500 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
