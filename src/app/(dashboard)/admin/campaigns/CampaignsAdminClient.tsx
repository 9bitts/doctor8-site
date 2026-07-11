"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Plus, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type CampaignItem = {
  id: string;
  name: string;
  status: string;
  stats: {
    total: number;
    sent: number;
    registered: number;
    conversionRate: number;
  };
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENDING: "bg-blue-100 text-blue-700",
  PAUSED: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-700",
};

export default function CampaignsAdminClient() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
      else setErr(data.error || t("admin.campaigns.errLoad"));
    } catch {
      setErr(t("common.loadError"));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="text-brand-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("admin.campaigns.title")}</h1>
            <p className="text-sm text-slate-500">{t("admin.campaigns.subtitle")}</p>
          </div>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={16} />
          {t("admin.campaigns.new")}
        </Link>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          {t("admin.campaigns.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">{t("admin.campaigns.colName")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.campaigns.colStatus")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.campaigns.colTotal")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.campaigns.colSent")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.campaigns.colRegistered")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("admin.campaigns.colConversion")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/campaigns/${c.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-700"}`}>
                      {t(`admin.campaigns.status.${c.status}`) || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.sent}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.registered}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
