"use client";

// src/app/(dashboard)/admin/rateio/AdminRateioClient.tsx
import { useCallback as useCallback2, useEffect as useEffect2, useState as useState2 } from "react";
import {
  PieChart,
  Loader2,
  RefreshCw,
  Play,
  Eye,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  PlusCircle
} from "lucide-react";

// src/lib/i18n/I18nProvider.tsx
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// src/lib/i18n/translations.ts
function localeOf(lang) {
  return lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
}

// src/lib/i18n/I18nProvider.tsx
var I18nContext = createContext({
  lang: "en",
  setLang: () => {
  },
  t: (k) => k
});
function useI18n() {
  return useContext(I18nContext);
}

// src/app/(dashboard)/admin/rateio/AdminRateioClient.tsx
var HIGH_VALUE_CENTS = 1e5;
function defaultMonth() {
  const n = /* @__PURE__ */ new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function costLabel(row) {
  if (row.sourceRef?.startsWith("AUTO-TAX-")) {
    return "Imposto Simples Nacional (autom\xE1tico)";
  }
  if (row.sourceRef?.startsWith("AUTO-TAX-ADJ-")) {
    return "Ajuste imposto Simples Nacional";
  }
  return row.sourceRef || row.category || row.type;
}
function AdminRateioClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [month, setMonth] = useState2(defaultMonth);
  const [currency, setCurrency] = useState2("BRL");
  const [preview, setPreview] = useState2(null);
  const [costs, setCosts] = useState2([]);
  const [loading, setLoading] = useState2(false);
  const [running, setRunning] = useState2(false);
  const [error, setError] = useState2("");
  const [runResult, setRunResult] = useState2("");
  const [costDescription, setCostDescription] = useState2("");
  const [costSourceRef, setCostSourceRef] = useState2("");
  const [costAmount, setCostAmount] = useState2("");
  const [costType, setCostType] = useState2("COST_FIXED");
  const [costFile, setCostFile] = useState2(null);
  const [uploadedKey, setUploadedKey] = useState2(null);
  const [uploadedName, setUploadedName] = useState2("");
  const [costSubmitting, setCostSubmitting] = useState2(false);
  const [costMessage, setCostMessage] = useState2("");
  function fmt(cents) {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  }
  const amountCents = Math.round(parseFloat(costAmount.replace(",", ".")) * 100);
  const highValueWarning = Number.isFinite(amountCents) && amountCents > HIGH_VALUE_CENTS;
  const loadCosts = useCallback2(async () => {
    try {
      const res = await fetch(`/api/admin/rateio?action=costs&month=${month}&currency=${currency}`);
      const data = await res.json();
      if (res.ok) setCosts(data.costs ?? []);
    } catch {
    }
  }, [month, currency]);
  const loadPreview = useCallback2(async () => {
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
  useEffect2(() => {
    loadPreview();
  }, [loadPreview]);
  async function uploadAttachment(file) {
    const prep = await fetch("/api/admin/rateio/cost-attachment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        month
      })
    });
    const prepData = await prep.json();
    if (!prep.ok) throw new Error(prepData.error || "Upload prep failed");
    const put = await fetch(prepData.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });
    if (!put.ok) throw new Error("Upload failed");
    return prepData.key;
  }
  async function submitCost(e) {
    e.preventDefault();
    setCostSubmitting(true);
    setCostMessage("");
    setError("");
    try {
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        setCostMessage("Informe um valor v\xE1lido.");
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
          description: costDescription.trim() || void 0,
          sourceRef: costSourceRef.trim() || void 0,
          attachmentKey: attachmentKey || void 0
        })
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
      setCostMessage("Custo lan\xE7ado com sucesso.");
      await loadPreview();
    } catch (err) {
      setCostMessage(err instanceof Error ? err.message : t("common.loadError"));
    } finally {
      setCostSubmitting(false);
    }
  }
  async function openAttachment(key) {
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
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.loadError"));
        return;
      }
      setRunResult(
        t("admin.rateio.runOk").replace("{{pool}}", fmt(data.close?.poolCents ?? 0)).replace("{{n}}", String(data.close?.professionals ?? 0))
      );
      await loadPreview();
    } catch {
      setError(t("common.loadError"));
    } finally {
      setRunning(false);
    }
  }
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto space-y-6 pb-10" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-slate-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PieChart, { size: 24, className: "text-brand-500" }), " ", t("admin.rateio.title")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-500 text-sm mt-1" }, t("admin.rateio.subtitle"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500 uppercase" }, t("admin.rateio.month")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "month",
      value: month,
      onChange: (e) => setMonth(e.target.value),
      className: "mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500 uppercase" }, t("admin.rateio.currency")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: currency,
      onChange: (e) => setCurrency(e.target.value),
      className: "mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
    },
    /* @__PURE__ */ React.createElement("option", { value: "BRL" }, "BRL"),
    /* @__PURE__ */ React.createElement("option", { value: "USD" }, "USD")
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: loadPreview,
      disabled: loading,
      className: "inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-4 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
    },
    /* @__PURE__ */ React.createElement(Eye, { size: 14 }),
    " ",
    t("admin.rateio.preview")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: runClose,
      disabled: running || loading,
      className: "inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl disabled:opacity-50"
    },
    running ? /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Play, { size: 14 }),
    t("admin.rateio.run")
  )), error && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "shrink-0 mt-0.5" }), " ", error), runResult && /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl" }, runResult), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PlusCircle, { size: 16, className: "text-brand-500" }), " ", "Lan\xE7ar custo manual"), /* @__PURE__ */ React.createElement("form", { onSubmit: submitCost, className: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "sm:col-span-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500" }, "Descri\xE7\xE3o"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: costDescription,
      onChange: (e) => setCostDescription(e.target.value),
      className: "mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2",
      placeholder: "Ex.: Fatura Railway mar\xE7o"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500" }, "Refer\xEAncia (NF / fatura)"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: costSourceRef,
      onChange: (e) => setCostSourceRef(e.target.value),
      className: "mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2",
      placeholder: "Opcional"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500" }, "Tipo"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: costType,
      onChange: (e) => setCostType(e.target.value),
      className: "mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
    },
    /* @__PURE__ */ React.createElement("option", { value: "COST_FIXED" }, "Custo fixo"),
    /* @__PURE__ */ React.createElement("option", { value: "COST_USAGE" }, "Custo vari\xE1vel")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500" }, "Valor (", currency, ")"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: costAmount,
      onChange: (e) => setCostAmount(e.target.value),
      inputMode: "decimal",
      className: `mt-1 w-full text-sm border rounded-lg px-3 py-2 ${highValueWarning ? "border-red-500 text-red-700 ring-1 ring-red-200" : "border-slate-200"}`,
      placeholder: "0,00"
    }
  ), highValueWarning && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-red-600 mt-1 font-medium" }, "Valor alto \u2014 confira antes de lan\xE7ar.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-slate-500" }, "Anexo (JPG, PNG ou PDF)"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      accept: "image/jpeg,image/png,application/pdf",
      onChange: (e) => {
        const f = e.target.files?.[0] ?? null;
        setCostFile(f);
        setUploadedKey(null);
        setUploadedName(f?.name ?? "");
      },
      className: "mt-1 w-full text-sm"
    }
  ), uploadedName && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-700 mt-1 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Paperclip, { size: 12 }), " ", uploadedName)), /* @__PURE__ */ React.createElement("div", { className: "sm:col-span-2 flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: costSubmitting,
      className: "inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl disabled:opacity-50"
    },
    costSubmitting ? /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(PlusCircle, { size: 14 }),
    "Lan\xE7ar custo"
  ), costMessage && /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600" }, costMessage)))), loading ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-16" }, /* @__PURE__ */ React.createElement(Loader2, { size: 28, className: "animate-spin text-slate-400" })) : preview ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" }, [
    { label: t("rateio.commission"), value: preview.commissionCents },
    { label: t("rateio.totalFixed"), value: preview.costFixedCents },
    { label: t("rateio.totalUsage"), value: preview.costUsageCents },
    { label: t("rateio.poolTitle"), value: preview.poolCents, highlight: true }
  ].map((c) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: c.label,
      className: `rounded-2xl border p-4 ${c.highlight ? "bg-brand-50 border-brand-200" : "bg-white border-slate-100"}`
    },
    /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, c.label),
    /* @__PURE__ */ React.createElement("p", { className: "text-lg font-bold text-slate-900 mt-1" }, fmt(c.value))
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "px-4 py-3 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 text-sm" }, "Custos do per\xEDodo")), /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-left text-xs uppercase text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, "Refer\xEAncia"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, "Tipo"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2 text-right" }, "Valor"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, "Anexo"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, costs.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, className: "px-4 py-6 text-center text-slate-400" }, "Nenhum custo lan\xE7ado neste per\xEDodo.")) : costs.map((c) => /* @__PURE__ */ React.createElement("tr", { key: c.id }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-slate-800" }, costLabel(c)), c.sourceRef && !c.sourceRef.startsWith("AUTO-TAX") && /* @__PURE__ */ React.createElement("span", { className: "block text-xs text-slate-500 font-mono" }, c.sourceRef)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-slate-600" }, c.type), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-semibold" }, fmt(c.amountCents)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, c.attachmentKey ? /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => openAttachment(c.attachmentKey),
      className: "inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
    },
    /* @__PURE__ */ React.createElement(ExternalLink, { size: 12 }),
    " ver anexo"
  ) : /* @__PURE__ */ React.createElement("span", { className: "text-slate-300" }, "-"))))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "px-4 py-3 border-b border-slate-100 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-800 text-sm" }, t("admin.rateio.contributions")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: loadPreview, className: "text-xs text-brand-600 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }), " ", t("common.retry"))), /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-left text-xs uppercase text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, t("admin.rateio.colPro")), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, t("admin.rateio.colConsults")), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2" }, t("admin.rateio.colQualified")), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-2 text-right" }, t("admin.rateio.colTotal")))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, preview.contributions.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, className: "px-4 py-8 text-center text-slate-400" }, t("admin.rateio.noData"))) : preview.contributions.map((c) => /* @__PURE__ */ React.createElement("tr", { key: c.professionalId }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 font-mono text-xs text-slate-500 truncate max-w-[120px]" }, c.professionalId.slice(0, 10), "..."), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, c.validConsults), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2" }, c.qualified ? "\u2713" : c.disqualReason || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-2 text-right font-semibold" }, fmt(c.totalCents)))))))) : null);
}
export {
  AdminRateioClient as default
};
