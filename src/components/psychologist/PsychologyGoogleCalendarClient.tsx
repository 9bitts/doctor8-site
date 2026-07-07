"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, Calendar, Loader2, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";

export default function PsychologyGoogleCalendarClient() {
  const { t } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);
  const searchParams = useSearchParams();
  const gcalStatus = searchParams.get("gcal");

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    syncEnabled: boolean;
    lastSyncedAt: string | null;
  } | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/professional/google-calendar/status");
      const data = await res.json();
      setStatus(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadStatus(); }, []);

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/professional/google-calendar/connect");
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
    } finally { setConnecting(false); }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      await fetch("/api/professional/google-calendar/sync", { method: "POST" });
      await loadStatus();
    } finally { setSyncing(false); }
  }

  async function disconnect() {
    await fetch("/api/professional/google-calendar/status", { method: "DELETE" });
    await loadStatus();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div>
        <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar size={24} className="text-violet-600" />
          {t("psy.gcal.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.gcal.desc")}</p>
      </div>

      {gcalStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={18} /> {t("psy.gcal.connectedMsg")}
        </div>
      )}
      {gcalStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle size={18} /> {t("psy.gcal.errorMsg")}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-500" /></div>
        ) : (
          <>
            <p className="text-sm text-slate-600">{t("psy.gcal.howItWorks")}</p>
            {!status?.configured && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">{t("psy.gcal.notConfigured")}</p>
            )}
            {status?.connected ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-emerald-700">{t("psy.gcal.statusConnected")}</p>
                {status.lastSyncedAt && (
                  <p className="text-xs text-slate-400">
                    {t("psy.gcal.lastSync")}: {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={syncNow}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {t("psy.gcal.syncNow")}
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600"
                  >
                    <Unlink size={16} /> {t("psy.gcal.disconnect")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={connecting || !status?.configured}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {t("psy.gcal.connect")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
