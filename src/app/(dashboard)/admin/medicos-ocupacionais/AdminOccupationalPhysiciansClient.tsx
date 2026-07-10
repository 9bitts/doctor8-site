"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope, Loader2, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AdminAccountActions, { AdminAccountStatusBadges } from "@/components/admin/AdminAccountActions";
import type { AdminOccupationalPhysicianRow } from "@/lib/admin/admin-users-search";

export default function AdminOccupationalPhysiciansClient() {
  const { t } = useI18n();
  const [physicians, setPhysicians] = useState<AdminOccupationalPhysicianRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/occupational-physicians");
    if (res.ok) {
      const data = await res.json();
      setPhysicians(data.physicians ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope size={24} className="text-teal-600" />
          {t("admin.occupational.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("admin.occupational.subtitle").replace("{{count}}", String(physicians.length))}
        </p>
      </div>

      {physicians.length === 0 ? (
        <p className="text-center text-slate-500 text-sm py-12 bg-white rounded-2xl border border-slate-200">
          {t("admin.occupational.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {physicians.map((p) => (
            <div key={p.userId} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{p.fullName ?? p.email}</p>
                  <p className="text-sm text-slate-500">{p.email}</p>
                  {p.crm && <p className="text-xs text-slate-400 mt-0.5">CRM: {p.crm}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-semibold uppercase bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                      {p.linkStatus}
                    </span>
                    {p.employerName && (
                      <Link
                        href="/admin/empresas"
                        className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                      >
                        <Building2 size={12} /> {p.employerName}
                      </Link>
                    )}
                  </div>
                  <AdminAccountStatusBadges
                    emailVerified={p.emailVerified}
                    locked={p.locked}
                  />
                </div>
              </div>
              <AdminAccountActions
                userId={p.userId}
                emailVerified={p.emailVerified}
                locked={p.locked}
                compact
                onActionDone={load}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
