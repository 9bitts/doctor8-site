"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Layers, Stethoscope, Users, CreditCard, Radio, Heart, ShoppingBag, Plug, ScrollText, PieChart,
  Building2, Pill, FlaskConical, Package, BookOpen, UserCog, Loader2, AlertTriangle, Lock, Clock, Megaphone,
  Sparkles, Globe, MessageCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AdminOverviewStats } from "@/lib/admin/admin-overview";

type LinkGroup = {
  labelKey: string;
  items: { href: string; labelKey: string; icon: typeof Plug }[];
};

const LINK_GROUPS: LinkGroup[] = [
  {
    labelKey: "admin.home.group.operation",
    items: [
      { href: "/admin/users", labelKey: "nav.adminUsers", icon: UserCog },
      { href: "/admin/patients", labelKey: "nav.adminPatients", icon: Users },
      { href: "/admin/mensagens", labelKey: "nav.adminMessages", icon: MessageCircle },
      { href: "/admin/doctors", labelKey: "nav.adminDoctors", icon: Stethoscope },
      { href: "/admin/acura-volunteers", labelKey: "nav.adminAcuraVolunteers", icon: Heart },
      { href: "/admin/medicos-ocupacionais", labelKey: "nav.adminOccupational", icon: Stethoscope },
      { href: "/admin/humanitarian", labelKey: "nav.adminHumanitarian", icon: Heart },
      { href: "/admin/jit-events", labelKey: "nav.adminJitEvents", icon: Radio },
    ],
  },
  {
    labelKey: "admin.home.group.b2b",
    items: [
      { href: "/admin/empresas", labelKey: "nav.adminEmployers", icon: Building2 },
      { href: "/admin/clinicas", labelKey: "nav.adminClinics", icon: Building2 },
      { href: "/admin/farmacias", labelKey: "nav.adminPharmacies", icon: Pill },
      { href: "/admin/laboratorios", labelKey: "nav.adminLaboratories", icon: FlaskConical },
      { href: "/admin/distribuidores", labelKey: "nav.adminDistributors", icon: Package },
      { href: "/admin/importacoes", labelKey: "nav.adminImports", icon: Package },
    ],
  },
  {
    labelKey: "admin.home.group.platform",
    items: [
      { href: "/admin/categories", labelKey: "nav.adminCategories", icon: Layers },
      { href: "/admin/courses", labelKey: "nav.adminCourses", icon: BookOpen },
      { href: "/admin/buying-clubs", labelKey: "nav.adminBuyingClubs", icon: ShoppingBag },
      { href: "/admin/campaigns", labelKey: "nav.adminCampaigns", icon: Megaphone },
      { href: "/admin/integrations", labelKey: "nav.adminIntegrations", icon: Plug },
      { href: "/admin/eight", labelKey: "nav.adminEight", icon: Sparkles },
      { href: "/admin/vital8erp", labelKey: "nav.adminVital8erp", icon: Globe },
    ],
  },
  {
    labelKey: "admin.home.group.finance",
    items: [
      { href: "/admin/payments", labelKey: "nav.adminPayments", icon: CreditCard },
      { href: "/admin/rateio", labelKey: "nav.adminRateio", icon: PieChart },
      { href: "/admin/audit", labelKey: "nav.adminAudit", icon: ScrollText },
    ],
  },
];

function PendingCard({
  href,
  label,
  count,
  icon: Icon,
  accent,
}: {
  href: string;
  label: string;
  count: number;
  icon: typeof Clock;
  accent: string;
}) {
  if (count <= 0) return null;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:shadow-sm ${accent}`}
    >
      <Icon size={18} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="text-xs font-medium mt-1 truncate">{label}</p>
      </div>
    </Link>
  );
}

export default function AdminHomeClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .finally(() => setLoadingStats(false));
  }, []);

  const hasPending = stats && (
    stats.pendingProviders > 0
    || stats.incompleteSignups > 0
    || stats.pendingAngels > 0
    || stats.lockedAccounts > 0
    || stats.unverifiedUsers > 0
    || (stats.humanitarianWaiting ?? 0) > 0
    || (stats.emailCampaignsAttention ?? 0) > 0
    || (stats.emailCampaignsPendingRecipients ?? 0) > 0
    || (stats.eightSsoBlocked ?? 0) > 0
    || (stats.vital8SsoBlocked ?? 0) > 0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.home.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.home.subtitle")}</p>
      </div>

      {loadingStats ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : hasPending ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            {t("admin.home.pendingTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PendingCard
              href="/admin/doctors?tab=pendentes"
              label={t("admin.home.pendingProviders")}
              count={stats!.pendingProviders}
              icon={Clock}
              accent="bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-300"
            />
            <PendingCard
              href="/admin/doctors?tab=incompletos"
              label={t("admin.home.incompleteSignups")}
              count={stats!.incompleteSignups}
              icon={AlertTriangle}
              accent="bg-orange-50 border-orange-200 text-orange-900 hover:border-orange-300"
            />
            <PendingCard
              href="/admin/doctors?tab=anjos"
              label={t("admin.home.pendingAngels")}
              count={stats!.pendingAngels}
              icon={Heart}
              accent="bg-rose-50 border-rose-200 text-rose-900 hover:border-rose-300"
            />
            <PendingCard
              href="/admin/users"
              label={t("admin.home.lockedAccounts")}
              count={stats!.lockedAccounts}
              icon={Lock}
              accent="bg-red-50 border-red-200 text-red-900 hover:border-red-300"
            />
            <PendingCard
              href="/admin/users"
              label={t("admin.home.unverifiedUsers")}
              count={stats!.unverifiedUsers}
              icon={AlertTriangle}
              accent="bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
            />
            <PendingCard
              href="/admin/humanitarian"
              label={t("admin.home.humanitarianWaiting")}
              count={stats!.humanitarianWaiting ?? 0}
              icon={Heart}
              accent="bg-violet-50 border-violet-200 text-violet-900 hover:border-violet-300"
            />
            <PendingCard
              href="/admin/campaigns"
              label={t("admin.home.emailCampaignsPending")}
              count={stats!.emailCampaignsPendingRecipients ?? 0}
              icon={Megaphone}
              accent="bg-sky-50 border-sky-200 text-sky-900 hover:border-sky-300"
            />
            {(stats!.emailCampaignsAttention ?? 0) > 0 && (stats!.emailCampaignsPendingRecipients ?? 0) === 0 ? (
              <PendingCard
                href="/admin/campaigns"
                label={t("admin.home.emailCampaignsAttention")}
                count={stats!.emailCampaignsAttention ?? 0}
                icon={Megaphone}
                accent="bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-300"
              />
            ) : null}
            <PendingCard
              href="/admin/eight"
              label={t("admin.home.eightSsoBlocked")}
              count={stats!.eightSsoBlocked ?? 0}
              icon={Sparkles}
              accent="bg-violet-50 border-violet-200 text-violet-900 hover:border-violet-300"
            />
            <PendingCard
              href="/admin/vital8erp"
              label={t("admin.home.vital8SsoBlocked")}
              count={stats!.vital8SsoBlocked ?? 0}
              icon={Globe}
              accent="bg-sky-50 border-sky-200 text-sky-900 hover:border-sky-300"
            />
          </div>
        </div>
      ) : null}

      {LINK_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            {t(group.labelKey)}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {group.items.map((item) => (
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
      ))}
    </div>
  );
}
