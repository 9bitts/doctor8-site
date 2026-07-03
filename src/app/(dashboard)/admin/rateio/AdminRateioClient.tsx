"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PieChart,
  Loader2,
  RefreshCw,
  Play,
  Eye,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface Contribution {
  professionalId: string;
  validConsults: number;
  qualified: boolean;
  disqualReason: string | null;
  totalCents: number;
  baseCents: number;
  meritCents: number;
}

interface PreviewData {
  month: string;
  currency: string;
  commissionCents: number;
  costFixedCents: number;
  costUsageCents: number;
  poolCents: number;
  contributions: Contribution[];
}

interface CostRow {
  id: string;
  type: string;
  category: string;
  amountCents: number;
  source: string;
  sourceRef: string | null;
  attachmentKey: string | null;
  occurredAt: string;
}

const HIGH_VALUE_CENTS = 100_000;

function defaultMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function costLabel(row: CostRow): string {
  if (row.sourceRef?.startsWith("AUTO-TAX-")) {
    return "Imposto Simples Nacional (autom\u00e1tico)";
  }
  if (row.sourceRef?.startsWith("AUTO-TAX-ADJ-")) {
    return "Ajuste imposto Simples Nacional";
  }
  return row.sourceRef || row.category || row.type;
}

export default function AdminRateioClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [month, setMonth] = useState(defaultMonth);
  const [currency, setCurrency] = useState("BRL");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [runResult, setRunResult] = useState("");

  const [costDescription, setCostDescription] = useState("");
  const [costSourceRef, setCostSourceRef] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costType, setCostType] = useState<"COST_FIXED" | "COST_USAGE">("COST_FIXED");
  const [costFile, setCostFile] = useState<File | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [costSubmitting, setCostSubmitting] = useState(false);
  const [costMessage, setCostMessage] = useState("");

  function fmt(cents: number): string {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  }

  const amountCents = Math.round(parseFloat(costAmount.replace(",", ".")) * 100);
  const highValueWarning =
    Number.isFinite(amountCents) && amountCents > HIGH_VALUE_CENTS;

  const loadCosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/rateio?action=costs&month=${month}&currency=${currency}`);
      const data = await res.json();
      if (res.ok) setCosts(data.costs ?? []);
    } catch {
      /* listagem secund\u00e1ria */
    }
  }, [month, currency]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    setRunResult("");
    try {
      const res = await fetch(`/api/admin/rateio?action=preview&month=${month}&currency=${currency}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.loadError"));
        setPreview(null);
        return;
      }
      setPreview(data);
      await loadCosts();
    } catch {
      setError(t("common.loadError"));
    } finally {
      setLoading(false);
    }
  }, [month, currency, t, loadCosts]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  async function uploadAttachment(file: File): Promise<string> {
    const prep = await fetch("/api/admin/rateio/cost-attachment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        month,
      }),
    });
    const prepData = await prep.json();
    if (!prep.ok) throw new Error(prepData.error || "Upload prep failed");

    const put = await fetch(prepData.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("Upload failed");
    return prepData.key as string;
  }

  async function submitCost(e: React.FormEvent) {
    e.preventDefault();
    setCostSubmitting(true);
    setCostMessage("");
    setError("");
    try {
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        setCostMessage("Informe um valor v\u00e1lido.");
        return;
      }

      let attachmentKey = uploadedKey;
      if (costFile && !attachmentKey) {
        attachmentKey = await uploadAttachment(costFile);
        setUploadedKey(attachmentKey);
        setUploadedName(costFile.name);
      }

      const res = await fetch(`/api/admin/rateio?action=cost&month=${month}&currency=${currency}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: costType,
          amountCents,
          category: "OTHER",
          source: "MANUAL_INVOICE",
          description: costDescription.trim() || undefined,
          sourceRef: costSourceRef.trim() || undefined,
          attachmentKey: attachmentKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCostMessage(data.error || t("common.loadError"));
        return;
      }

      setCostDescription("");
      setCostSourceRef("");
      setCostAmount("");
      setCostFile(null);
      setUploadedKey(null);
      setUploadedName("");
      setCostMessage("Custo lan\u00e7ado com sucesso.");
      await loadPreview();
    } catch (err) {
      setCostMessage(err instanceof Error ? err.message : t("common.loadError"));
    } finally {
      setCostSubmitting(false);
    }
  }

  async function openAttachment(key: string) {
    const res = await fetch(`/api/admin/rateio/cost-attachment?key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (!res.ok || !data.viewUrl) {
      setError(data.error || "Falha ao abrir anexo");
      return;
    }
    window.open(data.viewUrl, "_blank", "noopener,noreferrer");
  }

  async function runClose() {
    if (!window.confirm(t("admin.rateio.runConfirm"))) return;
    setRunning(true);
    setError("");
    setRunResult("");
    try {
      const res = await fetch(`/api/admin/rateio?action=run&month=${month}&currency=${currency}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.loadError"));
        return;
      }
      setRunResult(
        t("admin.rateio.runOk")
          .replace("{{pool}}", fmt(data.close?.poolCents ?? 0))
          .replace("{{n}}", String(data.close?.professionals ?? 0)),
      );
      await loadPreview();
    } catch {
      setError(t("common.loadError"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PieChart size={24} className="text-brand-500" /> {t("admin.rateio.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.rateio.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">{t("admin.rateio.month")}</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">{t("admin.rateio.currency")}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-4 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
        >
          <Eye size={14} /> {t("admin.rateio.preview")}
        </button>
        <button
          type="button"
          onClick={runClose}
          disabled={running || loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {t("admin.rateio.run")}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {runResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
          {runResult}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PlusCircle size={16} className="text-brand-500" /> {"Lan\u00e7ar custo manual"}
        </h2>
        <form onSubmit={submitCost} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500">{"Descri\u00e7\u00e3o"}</label>
            <input
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              placeholder={"Ex.: Fatura Railway mar\u00e7o"}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{"Refer\u00eancia (NF / fatura)"}</label>
            <input
              value={costSourceRef}
              onChange={(e) => setCostSourceRef(e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Tipo</label>
            <select
              value={costType}
              onChange={(e) => setCostType(e.target.value as "COST_FIXED" | "COST_USAGE")}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="COST_FIXED">Custo fixo</option>
              <option value="COST_USAGE">{"Custo vari\u00e1vel"}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Valor ({currency})</label>
            <input
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              inputMode="decimal"
              className={`mt-1 w-full text-sm border rounded-lg px-3 py-2 ${
                highValueWarning
                  ? "border-red-500 text-red-700 ring-1 ring-red-200"
                  : "border-slate-200"
              }`}
              placeholder="0,00"
            />
            {highValueWarning && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                {"Valor alto \u2014 confira antes de lan\u00e7ar."}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Anexo (JPG, PNG ou PDF)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCostFile(f);
                setUploadedKey(null);
                setUploadedName(f?.name ?? "");
              }}
              className="mt-1 w-full text-sm"
            />
            {uploadedName && (
              <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                <Paperclip size={12} /> {uploadedName}
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={costSubmitting}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {costSubmitting ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              {"Lan\u00e7ar custo"}
            </button>
            {costMessage && <span className="text-sm text-slate-600">{costMessage}</span>}
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      ) : preview ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("rateio.commission"), value: preview.commissionCents },
              { label: t("rateio.totalFixed"), value: preview.costFixedCents },
              { label: t("rateio.totalUsage"), value: preview.costUsageCents },
              { label: t("rateio.poolTitle"), value: preview.poolCents, highlight: true },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-2xl border p-4 ${
                  c.highlight ? "bg-brand-50 border-brand-200" : "bg-white border-slate-100"
                }`}
              >
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-slate-800 text-sm">{"Custos do per\u00edodo"}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">{"Refer\u00eancia"}</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2">Anexo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      {"Nenhum custo lan\u00e7ado neste per\u00edodo."}
                    </td>
                  </tr>
                ) : (
                  costs.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">
                        <span className="font-medium text-slate-800">{costLabel(c)}</span>
                        {c.sourceRef && !c.sourceRef.startsWith("AUTO-TAX") && (
                          <span className="block text-xs text-slate-500 font-mono">{c.sourceRef}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{c.type}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(c.amountCents)}</td>
                      <td className="px-4 py-2">
                        {c.attachmentKey ? (
                          <button
                            type="button"
                            onClick={() => openAttachment(c.attachmentKey!)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <ExternalLink size={12} /> ver anexo
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">{t("admin.rateio.contributions")}</p>
              <button type="button" onClick={loadPreview} className="text-xs text-brand-600 flex items-center gap-1">
                <RefreshCw size={12} /> {t("common.retry")}
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t("admin.rateio.colPro")}</th>
                  <th className="px-4 py-2">{t("admin.rateio.colConsults")}</th>
                  <th className="px-4 py-2">{t("admin.rateio.colQualified")}</th>
                  <th className="px-4 py-2 text-right">{t("admin.rateio.colTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.contributions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      {t("admin.rateio.noData")}
                    </td>
                  </tr>
                ) : (
                  preview.contributions.map((c) => (
                    <tr key={c.professionalId}>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500 truncate max-w-[120px]">
                        {c.professionalId.slice(0, 10)}...
                      </td>
                      <td className="px-4 py-2">{c.validConsults}</td>
                      <td className="px-4 py-2">
                        {c.qualified ? "\u2713" : c.disqualReason || "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(c.totalCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
