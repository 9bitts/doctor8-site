"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Mail, ArrowLeft, Loader2, Upload, AlertCircle, Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { emailShell, getAppUrl } from "@/lib/email-core";

type PreviewRow = { name?: string; email: string };

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

export default function CampaignCreateClient() {
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(
    "Olá {{nome}},\n\nConvidamos você a se cadastrar na nova plataforma Doctor8:\n\n{{link}}\n\nAtenciosamente,\nEquipe Doctor8",
  );
  const [batchSize, setBatchSize] = useState(300);
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const previewHtml = useMemo(
    () => buildPreviewHtml(subject, bodyHtml.replace(/\n/g, "<br/>")),
    [subject, bodyHtml],
  );

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      setPreviewRows(parseCsvPreview(text).slice(0, 10));
    };
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      setErr(t("admin.campaigns.errRequired"));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          bodyHtml: bodyHtml.replace(/\n/g, "<br/>"),
          batchSize,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : t("admin.campaigns.errSave"));
        setSaving(false);
        return;
      }

      if (csvText.trim()) {
        const importRes = await fetch(`/api/admin/campaigns/${data.id}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: csvText }),
        });
        if (!importRes.ok) {
          const importData = await importRes.json();
          setErr(importData.error || t("admin.campaigns.errImport"));
          setSaving(false);
          return;
        }
      }

      router.push(`/admin/campaigns/${data.id}`);
    } catch {
      setErr(t("common.loadError"));
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        {t("admin.campaigns.back")}
      </Link>

      <div className="flex items-center gap-3">
        <Mail className="text-brand-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("admin.campaigns.createTitle")}</h1>
          <p className="text-sm text-slate-500">{t("admin.campaigns.createSubtitle")}</p>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {err}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.nameLabel")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={t("admin.campaigns.namePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.subjectLabel")}</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.bodyLabel")}</label>
              <p className="text-xs text-slate-400 mb-1">{t("admin.campaigns.bodyHint")}</p>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("admin.campaigns.batchSizeLabel")}</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 300)}
                className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <label className="block text-sm font-medium text-slate-700">{t("admin.campaigns.csvLabel")}</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600">
              <Upload size={18} />
              {t("admin.campaigns.csvUpload")}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCsvFile(f);
                }}
              />
            </label>
            {previewRows.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">{t("admin.campaigns.csvPreview").replace("{{n}}", String(previewRows.length))}</p>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="px-3 py-2 text-left">{t("admin.campaigns.colName")}</th>
                        <th className="px-3 py-2 text-left">E-mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-50">
                          <td className="px-3 py-2">{r.name || "—"}</td>
                          <td className="px-3 py-2">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? t("admin.campaigns.saving") : t("admin.campaigns.create")}
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Eye size={16} />
            {showPreview ? t("admin.campaigns.hidePreview") : t("admin.campaigns.showPreview")}
          </button>
          {showPreview && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden">
              <p className="text-xs font-medium text-slate-500 mb-3">{t("admin.campaigns.emailPreview")}</p>
              <div
                className="text-sm overflow-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
