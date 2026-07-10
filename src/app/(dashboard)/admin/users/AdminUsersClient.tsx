"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, UserCog, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AdminAccountActions, { AdminAccountStatusBadges } from "@/components/admin/AdminAccountActions";
import type { AdminUserSearchRow } from "@/lib/admin/admin-users-search";

function resolveUserDetailHref(user: AdminUserSearchRow): string | null {
  if (user.role === "PATIENT") return null;
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "ANGEL") return "/admin/doctors?tab=anjos";
  if (
    user.role === "PROFESSIONAL"
    || user.role === "PSYCHOANALYST"
    || user.role === "INTEGRATIVE_THERAPIST"
  ) {
    return "/admin/doctors";
  }
  if (user.role === "OCCUPATIONAL_PHYSICIAN") return "/admin/medicos-ocupacionais";
  if (user.role === "EMPLOYER") return "/admin/empresas";
  if (user.role === "ORGANIZATION") return "/admin/clinicas";
  if (user.role === "PHARMACY_STORE") return "/admin/farmacias";
  if (user.role === "LABORATORY") return "/admin/laboratorios";
  return null;
}

export default function AdminUsersClient() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 350);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserCog size={24} className="text-brand-500" />
          {t("admin.users.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.users.subtitle")}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin.users.searchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      )}

      {!loading && searched && users.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">{t("admin.users.empty")}</p>
      )}

      <div className="space-y-3">
        {users.map((user) => {
          const detailHref = resolveUserDetailHref(user);
          return (
            <div
              key={user.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{user.name ?? user.email}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                    {user.region && (
                      <span className="text-[11px] text-slate-500">{user.region}</span>
                    )}
                    {user.profileHint && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {user.profileHint}
                      </span>
                    )}
                  </div>
                  <AdminAccountStatusBadges
                    emailVerified={user.emailVerified || user.phoneVerified}
                    locked={user.locked}
                    failedLoginAttempts={user.failedLoginAttempts}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.role === "PATIENT" && (
                    <Link
                      href={`/admin/patients?q=${encodeURIComponent(user.email)}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t("admin.users.viewPatient")} <ExternalLink size={12} />
                    </Link>
                  )}
                  {detailHref && (
                    <Link
                      href={detailHref}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      {t("admin.users.viewSection")} <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
              <AdminAccountActions
                userId={user.id}
                emailVerified={user.emailVerified || user.phoneVerified}
                locked={user.locked}
                compact
                onActionDone={() => search(query)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
