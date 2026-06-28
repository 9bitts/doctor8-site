"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type AppRow = {
  id: string;
  clientId: string;
  clientName?: string;
  scope: string;
  expiresAt: string;
  createdAt: string;
};

export default function ConnectedAppsPage() {
  const t = useT();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/connected-apps");
      const data = await res.json();
      if (res.ok) setApps(data.apps || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      await fetch(`/api/patient/connected-apps?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setApps((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <Link href="/patient/account" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 mb-3">
          <ArrowLeft size={14} /> {t("smart.apps.back")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield size={22} className="text-emerald-600" /> {t("smart.apps.title")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t("smart.apps.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : apps.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-100 rounded-2xl p-6">{t("smart.apps.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => (
            <li key={app.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{app.clientName || app.clientId}</p>
                {app.clientName && app.clientName !== app.clientId && (
                  <p className="text-xs text-slate-400 font-mono truncate">{app.clientId}</p>
                )}
                <p className="text-xs text-slate-500 mt-1 font-mono truncate">{app.scope}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {t("smart.apps.authorizedAt")} {new Date(app.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">
                  {t("smart.apps.expires")} {new Date(app.expiresAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                disabled={revoking === app.id}
                onClick={() => revoke(app.id)}
                className="shrink-0 text-rose-600 hover:bg-rose-50 p-2 rounded-lg"
                title={t("smart.apps.revoke")}
              >
                {revoking === app.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
