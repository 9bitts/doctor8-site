"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  Mail, ArrowLeft, Loader2, AlertTriangle, Pause, RotateCcw,
  Send, TestTube, Search, Pencil, Upload, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { emailShell, getAppUrl } from "@/lib/email-core";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
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

type PreviewRow = { name?: string; email: string };

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

function htmlToTextarea(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n");
}

function textareaToHtml(text: string): string {
  return text.replace(/\n/g, "<br/>");
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function parseCsvPreview(text: string): PreviewRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  const rows: PreviewRow[] = [];
  for (const row of parsed.data) {
    let email = "";
    let name = "";
    for (const [key, val] of Object.entries(row)) {
      const norm = normalizeHeader(key);
      if (["email", "e-mail", "e mail", "mail"].includes(norm) && val?.trim()) email = val.trim().toLowerCase();
      if (["nome", "name", "fullname", "nomecompleto"].includes(norm) && val?.trim()) name = val.trim();
    }
    if (email) rows.push({ email, name: name || undefined });
  }
  return rows;
}

function buildPreviewHtml(subject: string, bodyHtml: string): string {
  const displayName = "Dr. João Silva";
  const inviteLink = `${getAppUrl()}/register/professional/signup?invite=preview-token`;
  const unsubscribeLink = `${getAppUrl()}/unsubscribe?token=preview-token`;
  let body = bodyHtml
    .replace(/\{\{nome\}\}/gi, displayName)
    .replace(/\{\{link\}\}/gi, inviteLink);
  body += `<p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;"><a href="${unsubscribeLink}" style="color:#9ca3af;">Cancelar inscrição nesta lista</a></p>`;
  return emailShell(subject || "Assunto", body, "pt");
}

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editBatchSize, setEditBatchSize] = useState(300);
  const [showPreview, setShowPreview] = useState(false);

  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<PreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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

  useEffect(() => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditSubject(campaign.subject);
    setEditBody(htmlToTextarea(campaign.bodyHtml));
    setEditBatchSize(campaign.batchSize);
  }, [campaign?.id, campaign?.name, campaign?.subject, campaign?.bodyHtml, campaign?.batchSize]);

  const previewHtml = useMemo(
    () => buildPreviewHtml(editSubject, textareaToHtml(editBody)),
    [editSubject, editBody],
  );

  async function action(
    key: string,
    url: string,
    opts?: { method?: string; body?: object },
  ) {
    setBusy(key);
    setErr(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(url, {
        method: opts?.method || "POST",
        headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setErr(data.error || t("admin.campaigns.errAction"));
        return false;
      }
      await load();
      return true;
    } catch {
      setErr(t("common.loadError"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleSendTest() {
    const email = window.prompt(t("admin.campaigns.testEmailPrompt"));
    if (!email?.trim()) return;
    await action("test", `/api/admin/campaigns/${campaignId}/send-test`, {
      body: { email: email.trim() },
    });
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) {
      setErr(t("admin.campaigns.errRequired"));
      return;
    }
    const ok = await action("save", `/api/admin/campaigns/${campaignId}`, {
      method: "PATCH",
      body: {
        name: editName.trim(),
        subject: editSubject.trim(),
        bodyHtml: textareaToHtml(editBody),
        batchSize: editBatchSize,
      },
    });
    if (ok) setSuccessMsg(t("admin.campaigns.saved"));
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      setCsvPreview(parseCsvPreview(text).slice(0, 10));
      setImportSummary(null);
    };
    reader.readAsText(file);
  }

  async function handleImportCsv() {
    if (!csvText.trim()) return;
    setBusy("import");
    setErr(null);
    setImportSummary(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || t("admin.campaigns.errImport"));
      } else {
        setImportSummary(
          t("admin.campaigns.importSummary")
            .replace("{{imported}}", String(data.imported ?? 0))
            .replace("{{skipped}}", String((data.skippedExistingUser ?? 0) + (data.skippedDuplicate ?? 0)))
            .replace("{{invalid}}", String(data.invalid ?? 0)),
        );
        setCsvText("");
        setCsvPreview([]);
        await load();
      }
    } catch {
      setErr(t("common.loadError"));
    }
    setBusy(null);
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
  const canEdit = campaign.status === "DRAFT" || campaign.status === "PAUSED";
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMsg}</div>
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
        <button type="button" onClick={handleSendTest} disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
          {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
          {t("admin.campaigns.sendTest")}
        </button>
        <button type="button" onClick={() => action("batch", `/api/admin/campaigns/${campaignId}/send-batch`)} disabled={!!busy || !canSendBatch}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          {busy === "batch" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t("admin.campaigns.sendBatch").replace("{{n}}", String(campaign.batchSize))}
        </button>
        {isSending && (
          <button type="button" onClick={() => action("pause", `/api/admin/campaigns/${campaignId}/pause`)} disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50">
            {busy === "pause" ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
            {t("admin.campaigns.pause")}
          </button>
        )}
        {isPaused && (
          <button type="button" onClick={() => action("resume", `/api/admin/campaigns/${campaignId}/resume`)} disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 hover:bg-green-100 disabled:opacity-50">
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

      {canEdit && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button type="button" onClick={() => setShowEdit((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50">
            <span className="inline-flex items-center gap-2 font-medium text-slate-800">
              <Pencil size={16} />
              {t("admin.campaigns.editSection")}
            </span>
            {showEdit ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showEdit && (
            <div className="border-t border-slate-100 px-5 py-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.nameLabel")}</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.batchSizeLabel")}</label>
                  <input type="number" min={1} max={1000} value={editBatchSize}
                    onChange={(e) => setEditBatchSize(parseInt(e.target.value, 10) || 300)}
                    className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.subjectLabel")}</label>
                <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.bodyLabel")}</label>
                <p className="text-xs text-slate-400 mb-1">{t("admin.campaigns.bodyHint")}</p>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" />
              </div>
              <button type="button" onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <Eye size={14} />
                {showPreview ? t("admin.campaigns.hidePreview") : t("admin.campaigns.showPreview")}
              </button>
              {showPreview && (
                <div className="rounded-xl border border-slate-100 p-3 overflow-auto max-h-80"
                  dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
              <button type="button" onClick={handleSaveEdit} disabled={busy === "save"}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : null}
                {t("admin.campaigns.saveChanges")}
              </button>
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button type="button" onClick={() => setShowImport((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50">
            <span className="inline-flex items-center gap-2 font-medium text-slate-800">
              <Upload size={16} />
              {t("admin.campaigns.importSection")}
            </span>
            {showImport ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showImport && (
            <div className="border-t border-slate-100 px-5 py-5 space-y-4">
              <p className="text-sm text-slate-500">{t("admin.campaigns.importHint")}</p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600">
                <Upload size={18} />
                {t("admin.campaigns.csvUpload")}
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
              </label>
              {csvPreview.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="px-3 py-2 text-left">{t("admin.campaigns.colName")}</th>
                        <th className="px-3 py-2 text-left">E-mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((r, i) => (
                        <tr key={i} className="border-t border-slate-50">
                          <td className="px-3 py-2">{r.name || "—"}</td>
                          <td className="px-3 py-2">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {importSummary && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{importSummary}</p>
              )}
              <button type="button" onClick={handleImportCsv} disabled={!csvText.trim() || busy === "import"}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                {busy === "import" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {t("admin.campaigns.confirmImport")}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchQ} onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
              placeholder={t("admin.campaigns.searchEmail")}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
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
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40">←</button>
            <span className="text-sm text-slate-500">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40">→</button>
          </div>
        )}
      </div>
    </div>
  );
}
