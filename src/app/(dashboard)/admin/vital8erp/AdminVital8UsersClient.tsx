"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, Loader2, ExternalLink, Search, RefreshCw, CheckCircle2, AlertTriangle, MinusCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { VITAL8_ERP_URL } from "@/lib/vital8-erp";
import AdminAccountActions, { AdminAccountStatusBadges } from "@/components/admin/AdminAccountActions";
import type { AdminVital8UserRow, AdminSsoClientStats, AdminSsoRecentLogin } from "@/lib/admin/admin-sso-users";

type Vital8SsoStatus = AdminVital8UserRow["ssoStatus"];

function statusBadge(status: Vital8SsoStatus, t: (k: string) => string) {
  const map: Record<Vital8SsoStatus, string> = {
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    unverified: "bg-amber-50 text-amber-800 border-amber-200",
    inactive_entity: "bg-orange-50 text-orange-800 border-orange-200",
    no_membership: "bg-slate-100 text-slate-700 border-slate-200",
    locked: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${map[status]}`}>
      {t(`admin.vital8.ssoStatus.${status}`)}
    </span>
  );
}

export default function AdminVital8UsersClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [users, setUsers] = useState<AdminVital8UserRow[]>([]);
  const [stats, setStats] = useState<AdminSsoClientStats | null>(null);
  const [recentSsoLogins, setRecentSsoLogins] = useState<AdminSsoRecentLogin[]>([]);
  const [configured, setConfigured] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [orgType, setOrgType] = useState("");
  const [ssoStatus, setSsoStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (role) qs.set("role", role);
    if (orgType) qs.set("orgType", orgType);
    if (ssoStatus) qs.set("ssoStatus", ssoStatus);
    const res = await fetch(`/api/admin/sso/vital8?${qs}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setStats(data.stats ?? null);
      setRecentSsoLogins(data.recentSsoLogins ?? []);
      setConfigured(!!data.configured);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [q, role, orgType, ssoStatus]);

  useEffect(() => { load(); }, [load]);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(locale);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={24} className="text-sky-600" />
            {t("admin.vital8.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("admin.vital8.subtitle").replace("{{count}}", String(total))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={VITAL8_ERP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 border border-sky-200 bg-sky-50 px-3 py-2 rounded-xl hover:bg-sky-100"
          >
            <ExternalLink size={14} /> {t("admin.vital8.openApp")}
          </a>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("common.retry")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {configured ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 size={14} /> {t("admin.sso.configured")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <AlertTriangle size={14} /> {t("admin.sso.notConfigured")}
          </span>
        )}
      </div>

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: t("admin.sso.stat.total"), value: stats.total },
            { label: t("admin.sso.stat.ready"), value: stats.ready },
            { label: t("admin.sso.stat.unverified"), value: stats.unverified },
            { label: t("admin.sso.stat.blocked"), value: stats.blocked },
            { label: t("admin.sso.stat.logins24h"), value: stats.ssoLogins24h },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Search size={12} /> {t("admin.sso.search")}
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.sso.searchPlaceholder")}
            className="mt-1 block w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.sso.filterRole")}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full min-w-[160px] text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">{t("admin.sso.allRoles")}</option>
            {["ORGANIZATION", "EMPLOYER", "PHARMACY_STORE", "LABORATORY"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.vital8.filterOrgType")}</label>
          <select
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            className="mt-1 block w-full min-w-[140px] text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">{t("admin.sso.allStatuses")}</option>
            {["CLINIC", "EMPLOYER", "PHARMACY", "LABORATORY"].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.sso.filterStatus")}</label>
          <select
            value={ssoStatus}
            onChange={(e) => setSsoStatus(e.target.value)}
            className="mt-1 block w-full min-w-[160px] text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">{t("admin.sso.allStatuses")}</option>
            {(["ready", "unverified", "inactive_entity", "no_membership", "locked"] as Vital8SsoStatus[]).map((s) => (
              <option key={s} value={s}>{t(`admin.vital8.ssoStatus.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-slate-500 text-sm py-12 bg-white rounded-2xl border border-slate-200">
          {t("admin.vital8.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.userId} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{user.name ?? user.email}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-semibold uppercase bg-sky-50 text-sky-700 px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                    {user.orgType && (
                      <span className="text-xs text-slate-500">{user.orgType}</span>
                    )}
                    {statusBadge(user.ssoStatus, t)}
                  </div>
                  {(user.orgName || user.orgCnpj) && (
                    <p className="text-sm text-slate-700 mt-1">
                      {user.orgName}
                      {user.orgCnpj && <span className="text-slate-500"> · CNPJ {user.orgCnpj}</span>}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    {user.memberRole && <span>{t("admin.vital8.memberRole")}: {user.memberRole}</span>}
                    {user.entityStatus && <span>{t("admin.vital8.entityStatus")}: {user.entityStatus}</span>}
                    <span>{t("admin.sso.lastLogin")}: {formatDate(user.lastLoginAt)}</span>
                    <span>{t("admin.sso.createdAt")}: {formatDate(user.createdAt)}</span>
                  </div>
                  <AdminAccountStatusBadges
                    emailVerified={user.emailVerified}
                    locked={user.locked}
                  />
                </div>
                {user.adminHref && (
                  <Link
                    href={user.adminHref}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {t("admin.vital8.viewTenant")}
                  </Link>
                )}
              </div>
              <AdminAccountActions
                userId={user.userId}
                emailVerified={user.emailVerified}
                locked={user.locked}
                onActionDone={load}
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800">{t("admin.sso.recentLogins")}</h2>
        {recentSsoLogins.length === 0 ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <MinusCircle size={14} /> {t("admin.sso.noRecentLogins")}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentSsoLogins.map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{log.userEmail ?? "—"}</span>
                  {log.userRole && (
                    <span className="ml-2 text-xs text-slate-500">{log.userRole}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
