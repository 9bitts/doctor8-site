"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mail, ArrowLeft, Loader2, AlertTriangle, Pause, RotateCcw,
  Send, TestTube, Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  batchSize: number;
  lastError: string | null;
};

type Recipient = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  batchNumber: number | null;
  sentAt: string | null;
  registeredAt: string | null;
  errorMessage: string | null;
};

type Stats = {
  total: number;
  pending: number;
  sent: number;
  sendFailed: number;
  registered: number;
  optedOut: number;
  conversionRate: number;
  byStatus: Record<string, number>;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENDING: "bg-blue-100 text-blue-700",
  PAUSED: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-700",
  PENDING: "bg-slate-100 text-slate-600",
  SENT: "bg-green-50 text-green-700",
  SEND_FAILED: "bg-red-50 text-red-700",
  REGISTERED: "bg-brand-50 text-brand-700",
  OPTED_OUT: "bg-slate-100 text-slate-500",
};

const RECIPIENT_STATUSES = [
  "", "PENDING", "SENT", "SEND_FAILED", "REGISTERED", "OPTED_OUT",
];

export default function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (searchQ.trim()) qs.set("q", searchQ.trim());
      qs.set("page", String(page));
      qs.set("limit", "50");

      const res = await fetch(`/api/admin/campaigns/${campaignId}?${qs}`);
      const data = await res.json();
      if (res.ok) {
        setCampaign(data.campaign);
        setStats(data.stats);
        setRecipients(data.recipients || []);
        setTotalPages(data.pagination?.pages || 1);
        setErr(null);
      } else {
        setErr(data.error || t("admin.campaigns.errLoad"));
      }
    } catch {
      setErr(t("common.loadError"));
    }
    setLoading(false);
  }, [campaignId, statusFilter, searchQ, page, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (campaign?.status !== "SENDING") return;
    const id = setInterval(() => { load(); }, 4000);
    return () => clearInterval(id);
  }, [campaign?.status, load]);

  async function action(
    key: string,
    url: string,
    opts?: { method?: string; body?: object; expect202?: boolean },
  ) {
    setBusy(key);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: opts?.method || "POST",
        headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setErr(data.error || t("admin.campaigns.errAction"));
      } else {
        await load();
      }
    } catch {
      setErr(t("common.loadError"));
    }
    setBusy(null);
  }

  async function handleSendTest() {
    const email = window.prompt(t("admin.campaigns.testEmailPrompt"));
    if (!email?.trim()) return;
    await action("test", `/api/admin/campaigns/${campaignId}/send-test`, {
      body: { email: email.trim() },
    });
  }

  if (loading && !campaign) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!campaign || !stats) {
    return (
      <div className="max-w-5xl mx-auto py-10 text-center text-slate-500">
        {err || t("admin.campaigns.notFound")}
      </div>
    );
  }

  const isPaused = campaign.status === "PAUSED";
  const isSending = campaign.status === "SENDING";
  const canSendBatch = !isPaused && stats.pending + stats.sendFailed > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        {t("admin.campaigns.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="text-brand-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-sm text-slate-500">{campaign.subject}</p>
          </div>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[campaign.status] || "bg-slate-100"}`}>
          {t(`admin.campaigns.status.${campaign.status}`) || campaign.status}
        </span>
      </div>

      {campaign.lastError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-900">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t("admin.campaigns.lastErrorTitle")}</p>
            <p className="text-sm mt-1">{campaign.lastError}</p>
          </div>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("admin.campaigns.colTotal"), value: stats.total },
          { label: t("admin.campaigns.colSent"), value: stats.sent },
          { label: t("admin.campaigns.colRegistered"), value: stats.registered },
          { label: t("admin.campaigns.colConversion"), value: `${stats.conversionRate}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSendTest}
          disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
          {t("admin.campaigns.sendTest")}
        </button>

        <button
          type="button"
          onClick={() => action("batch", `/api/admin/campaigns/${campaignId}/send-batch`, { expect202: true })}
          disabled={!!busy || !canSendBatch}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy === "batch" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t("admin.campaigns.sendBatch").replace("{{n}}", String(campaign.batchSize))}
        </button>

        {isSending && (
          <button
            type="button"
            onClick={() => action("pause", `/api/admin/campaigns/${campaignId}/pause`)}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {busy === "pause" ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
            {t("admin.campaigns.pause")}
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            onClick={() => action("resume", `/api/admin/campaigns/${campaignId}/resume`)}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 hover:bg-green-100 disabled:opacity-50"
          >
            {busy === "resume" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {t("admin.campaigns.resume")}
          </button>
        )}

        {isSending && (
          <span className="inline-flex items-center gap-2 text-sm text-blue-600 px-2">
            <Loader2 size={14} className="animate-spin" />
            {t("admin.campaigns.sending")}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
              placeholder={t("admin.campaigns.searchEmail")}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">{t("admin.campaigns.allStatuses")}</option>
            {RECIPIENT_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">E-mail</th>
                <th className="px-3 py-2 font-medium">{t("admin.campaigns.colName")}</th>
                <th className="px-3 py-2 font-medium">{t("admin.campaigns.colStatus")}</th>
                <th className="px-3 py-2 font-medium">Lote</th>
                <th className="px-3 py-2 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    {t("admin.campaigns.noRecipients")}
                  </td>
                </tr>
              ) : recipients.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-3 py-2">{r.name || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[r.status] || "bg-slate-100"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.batchNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={r.errorMessage || ""}>
                    {r.errorMessage || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40"
            >
              ←
            </button>
            <span className="text-sm text-slate-500">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
