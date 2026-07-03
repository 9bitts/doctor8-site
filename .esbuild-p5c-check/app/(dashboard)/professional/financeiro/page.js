"use client";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma, db;
var init_db = __esm({
  "src/lib/db.ts"() {
    "use strict";
    globalForPrisma = globalThis;
    db = globalForPrisma.prisma ?? new PrismaClient({
      log: true ? ["query", "error", "warn"] : ["error"]
    });
    globalForPrisma.prisma = db;
  }
});

// src/app/(dashboard)/professional/financeiro/page.tsx
import { useState as useState6, useEffect as useEffect6, useCallback as useCallback4 } from "react";
import {
  TrendingUp,
  DollarSign as DollarSign2,
  Percent,
  FileText,
  Calendar,
  Loader2 as Loader25,
  AlertCircle as AlertCircle3,
  ChevronDown as ChevronDown2,
  ArrowUpRight,
  RefreshCw as RefreshCw3,
  Stethoscope,
  Radio,
  MapPin,
  BarChart3,
  Info as Info3
} from "lucide-react";

// src/components/professional/ConsultPricingSettings.tsx
import { useState as useState2, useEffect as useEffect2, useRef as useRef2, useCallback as useCallback2 } from "react";

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
function useT() {
  return useContext(I18nContext).t;
}

// src/components/professional/ConsultPricingSettings.tsx
import { DollarSign, Video, Building2, Loader2, CheckCircle2 } from "lucide-react";
var CURRENCIES = ["USD", "EUR", "GBP", "BRL"];
var inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";
function ConsultPricingSettings({
  profileApiPath = "/api/professional/profile",
  pricingPatchPath,
  showSessionDuration = false,
  accent = "brand",
  embedded = false,
  autoSave = false,
  hideSaveButton = false,
  onSaved
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState2(true);
  const [saving, setSaving] = useState2(false);
  const [saved, setSaved] = useState2(false);
  const [error, setError] = useState2("");
  const [price, setPrice] = useState2("");
  const [currency, setCurrency] = useState2("USD");
  const [acceptsTeleconsult, setAcceptsTeleconsult] = useState2(true);
  const [acceptsInPerson, setAcceptsInPerson] = useState2(false);
  const [sessionDurationMins, setSessionDurationMins] = useState2("50");
  const readyRef = useRef2(false);
  const debounceRef = useRef2(null);
  const accentText = accent === "teal" ? "text-teal-500" : "text-brand-500";
  const accentBg = accent === "teal" ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-brand-50 border-brand-200 text-brand-600";
  const accentBtn = accent === "teal" ? "bg-teal-600 hover:bg-teal-700" : "bg-brand-500 hover:bg-brand-400";
  const accentRing = accent === "teal" ? "focus:ring-teal-500/40" : "focus:ring-brand-500/40";
  const accentCheck = accent === "teal" ? "accent-teal-600" : "accent-brand-500";
  useEffect2(() => {
    fetch(profileApiPath).then((r) => r.json()).then((d) => {
      const p = d.profile;
      if (p) {
        setPrice(p.consultPrice ? String(p.consultPrice / 100) : "");
        setCurrency(p.currency || "USD");
        setAcceptsTeleconsult(p.acceptsTeleconsult ?? true);
        setAcceptsInPerson(p.acceptsInPerson ?? false);
        if (showSessionDuration) {
          setSessionDurationMins(String(p.sessionDurationMins || 50));
        }
      }
    }).catch(() => setError(t("it.settings.pricingLoadErr"))).finally(() => {
      setLoading(false);
      readyRef.current = true;
    });
  }, [profileApiPath, showSessionDuration, t]);
  const persist = useCallback2(async () => {
    setError("");
    if (!price || Number(price) <= 0) return;
    setSaving(true);
    try {
      if (pricingPatchPath) {
        const res = await fetch(pricingPatchPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultPrice: Math.round(Number(price) * 100),
            currency,
            acceptsTeleconsult,
            acceptsInPerson,
            sessionDurationMins: Number(sessionDurationMins) || 50
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      } else {
        const res = await fetch(profileApiPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultPrice: Math.round(Number(price) * 100),
            currency,
            acceptsTeleconsult,
            acceptsInPerson
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("set.errGeneric"));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3e3);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("set.errGeneric"));
    } finally {
      setSaving(false);
    }
  }, [
    price,
    currency,
    acceptsTeleconsult,
    acceptsInPerson,
    sessionDurationMins,
    pricingPatchPath,
    profileApiPath,
    t,
    onSaved
  ]);
  useEffect2(() => {
    if (!autoSave || !readyRef.current) return;
    if (!price || Number(price) <= 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [price, currency, acceptsTeleconsult, acceptsInPerson, sessionDurationMins, autoSave, persist]);
  async function handleSave() {
    if (!price || Number(price) <= 0) {
      setError(t("it.settings.pricingRequired"));
      return;
    }
    await persist();
  }
  if (loading) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `flex justify-center ${embedded ? "py-6" : "bg-white rounded-2xl border border-slate-100 shadow-sm p-6"}`
      },
      /* @__PURE__ */ React.createElement(Loader2, { className: `animate-spin ${accentText}`, size: 22 })
    );
  }
  const showSaveButton = !hideSaveButton && !autoSave;
  const form = /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, !embedded && /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "font-semibold text-slate-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(DollarSign, { size: 18, className: accentText }), " ", t("set.consultation")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500 mt-1" }, t("it.settings.pricingDesc"))), saved && !autoSave && /* @__PURE__ */ React.createElement(
    "span",
    {
      className: `inline-flex items-center gap-1.5 text-xs font-medium border px-3 py-1.5 rounded-full ${accentBg}`
    },
    /* @__PURE__ */ React.createElement(CheckCircle2, { size: 14 }),
    " ",
    t("avail.saved")
  )), embedded && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500" }, t("it.settings.pricingDesc")), autoSave && (saving || saved) && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 flex items-center gap-1.5" }, saving ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Loader2, { size: 12, className: "animate-spin" }), " ", t("set.autoSaving")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 12, className: "text-emerald-500" }), " ", t("set.autoSaved"))), error && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" }, error), /* @__PURE__ */ React.createElement("div", { className: "grid sm:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-slate-600 mb-1.5" }, showSessionDuration ? t("it.settings.price") : t("set.pricePerConsult")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      className: `${inputClass} ${accentRing}`,
      value: price,
      onChange: (e) => setPrice(e.target.value),
      placeholder: t("set.pricePlaceholder")
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-slate-600 mb-1.5" }, t("set.currency")), /* @__PURE__ */ React.createElement(
    "select",
    {
      className: `${inputClass} bg-white ${accentRing}`,
      value: currency,
      onChange: (e) => setCurrency(e.target.value)
    },
    CURRENCIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
  ))), showSessionDuration && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-slate-600 mb-1.5" }, t("it.settings.duration")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: 15,
      className: `${inputClass} ${accentRing}`,
      value: sessionDurationMins,
      onChange: (e) => setSessionDurationMins(e.target.value)
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 pt-1" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: acceptsTeleconsult,
      onChange: (e) => setAcceptsTeleconsult(e.target.checked),
      className: `w-4 h-4 ${accentCheck}`
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Video, { size: 15 }), " ", t("set.acceptTele"))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: acceptsInPerson,
      onChange: (e) => setAcceptsInPerson(e.target.checked),
      className: `w-4 h-4 ${accentCheck}`
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Building2, { size: 15 }), " ", t("set.acceptInPerson")))), showSaveButton && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleSave,
      disabled: saving,
      className: `${accentBtn} disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2`
    },
    saving && /* @__PURE__ */ React.createElement(Loader2, { size: 14, className: "animate-spin" }),
    saving ? t("set.saving") : t("it.settings.pricingSave")
  ));
  if (embedded) return form;
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-6" }, form);
}

// src/app/(dashboard)/professional/financeiro/RateioSection.tsx
import { useEffect as useEffect3, useState as useState3 } from "react";
import {
  BookOpen,
  Loader2 as Loader22,
  Users,
  Award,
  TrendingDown,
  Sparkles,
  History,
  Info,
  CheckCircle2 as CheckCircle22,
  XCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
function RateioSection({ currency: fallbackCurrency }) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [data, setData] = useState3(null);
  const [loading, setLoading] = useState3(true);
  const [loadError, setLoadError] = useState3(false);
  function fmt2(cents, currency) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "BRL" }).format(cents / 100);
  }
  function fmtMonth(m2) {
    const [y, mo] = m2.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  function catLabel(cat) {
    return t(`rateio.cat.${cat}`) !== `rateio.cat.${cat}` ? t(`rateio.cat.${cat}`) : cat;
  }
  function srcLabel(src) {
    return t(`rateio.src.${src}`) !== `rateio.src.${src}` ? t(`rateio.src.${src}`) : src;
  }
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/professional/financeiro/rateio");
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      setData(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect3(() => {
    load();
  }, []);
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Loader22, { size: 22, className: "animate-spin text-slate-300" }));
  }
  if (loadError) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-amber-200 shadow-sm p-8 flex flex-col items-center gap-3" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 24, className: "text-amber-500" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, t("common.loadError")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: load, className: "text-sm font-semibold text-emerald-600 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }), " ", t("common.retry")));
  }
  const latest = data?.latest ?? null;
  const cur = latest?.currency || fallbackCurrency || "BRL";
  if (!latest) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-slate-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BookOpen, { size: 18, className: "text-brand-500" }), " ", t("rateio.title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500 mt-2 max-w-2xl" }, t("rateio.emptyDesc")));
  }
  const m = latest.mine;
  const closedLabel = latest.lockedAt ? t("rateio.closedOn").replace("{{date}}", new Date(latest.lockedAt).toLocaleDateString(locale)) : "-";
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-slate-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BookOpen, { size: 18, className: "text-brand-500" }), " ", t("rateio.title")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400 capitalize" }, fmtMonth(latest.month), " \xB7 ", closedLabel)), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold opacity-90 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 15 }), " ", t("rateio.yourShare").replace("{{month}}", fmtMonth(latest.month))), m && m.qualified ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-bold mt-1" }, fmt2(m.totalCents, cur)), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80 mt-1" }, t("rateio.baseMerit").replace("{{base}}", fmt2(m.baseCents, cur)).replace("{{merit}}", fmt2(m.meritCents, cur)).replace("{{n}}", String(m.validConsults)))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold mt-1" }, t("rateio.notParticipating")), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80 mt-1" }, m?.disqualReason || t("rateio.noValidConsults")))), m && /* @__PURE__ */ React.createElement("div", { className: "bg-white/20 rounded-xl px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold flex items-center gap-1.5 justify-center" }, m.qualified ? /* @__PURE__ */ React.createElement(CheckCircle22, { size: 20 }) : /* @__PURE__ */ React.createElement(XCircle, { size: 20 }), m.qualified ? t("rateio.qualified") : "-"), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80" }, t("rateio.multiplier").replace("{{n}}", m.qualityMult.toFixed(2)))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-700 flex items-center gap-2 mb-4" }, /* @__PURE__ */ React.createElement(Users, { size: 16, className: "text-brand-500" }), " ", t("rateio.poolSource").replace("{{n}}", String(latest.professionalsCount))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 flex items-center gap-2" }, t("rateio.commission"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" }, t("rateio.sourceStripe"))), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-slate-800" }, fmt2(latest.commissionCents, cur))), latest.costBreakdown.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pl-1 border-l-2 border-rose-100 space-y-1.5 my-2" }, latest.costBreakdown.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center justify-between text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(TrendingDown, { size: 12, className: "text-rose-400" }), catLabel(c.category), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" }, c.type === "COST_FIXED" ? t("rateio.costFixed") : t("rateio.costUsage"), " \xB7 ", srcLabel(c.source))), /* @__PURE__ */ React.createElement("span", { className: "text-rose-500" }, "- ", fmt2(c.amountCents, cur))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs text-rose-500" }, /* @__PURE__ */ React.createElement("span", null, t("rateio.totalFixed")), /* @__PURE__ */ React.createElement("span", null, "- ", fmt2(latest.costFixedCents, cur))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs text-rose-500" }, /* @__PURE__ */ React.createElement("span", null, t("rateio.totalUsage")), /* @__PURE__ */ React.createElement("span", null, "- ", fmt2(latest.costUsageCents, cur))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pt-2 mt-1 border-t border-slate-100" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-800 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Award, { size: 15, className: "text-brand-500" }), " ", t("rateio.poolTitle")), /* @__PURE__ */ React.createElement("span", { className: "text-lg font-bold text-brand-600" }, fmt2(latest.poolCents, cur))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 text-right" }, t("rateio.splitNote").replace("{{base}}", String(Math.round(latest.baseFraction * 100))).replace("{{merit}}", String(Math.round(latest.meritFraction * 100))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-start gap-2 text-[11px] text-slate-500" }, /* @__PURE__ */ React.createElement(Info, { size: 13, className: "shrink-0 mt-0.5 text-slate-400" }), /* @__PURE__ */ React.createElement("p", null, t("rateio.auditNote")))), data && data.history.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "px-5 py-3 border-b border-slate-100" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(History, { size: 15, className: "text-slate-400" }), " ", t("rateio.history"))), /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-slate-100" }, data.history.map((h, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "px-5 py-3 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-slate-700 capitalize" }, fmtMonth(h.month)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, t("rateio.monthPool").replace("{{amount}}", fmt2(h.poolCents, h.currency)))), /* @__PURE__ */ React.createElement("span", { className: `text-sm font-bold ${h.qualified ? "text-brand-600" : "text-slate-400"}` }, h.qualified ? fmt2(h.totalCents, h.currency) : "-"))))));
}

// src/components/financeiro/RateioRules.tsx
import { useEffect as useEffect4, useState as useState4 } from "react";
import { ChevronDown, Loader2 as Loader23 } from "lucide-react";
function pct(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value * 100);
}
function fmtRating(value) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
function fmtMult(value) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
function AccordionBlock({
  title,
  children,
  defaultOpen = false
}) {
  const [open, setOpen] = useState4(defaultOpen);
  return /* @__PURE__ */ React.createElement("div", { className: "border border-slate-100 rounded-xl overflow-hidden bg-white" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setOpen((v) => !v),
      className: "w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
    },
    /* @__PURE__ */ React.createElement("span", null, title),
    /* @__PURE__ */ React.createElement(
      ChevronDown,
      {
        size: 18,
        className: `shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`
      }
    )
  ), open && /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4 text-sm text-slate-600 leading-relaxed" }, children));
}
function RateioRules({ rules, myProgress }) {
  const progressPct = Math.min(
    100,
    rules.minValidConsults > 0 ? myProgress.validConsults / rules.minValidConsults * 100 : 0
  );
  const remaining = Math.max(0, rules.minValidConsults - myProgress.validConsults);
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-slate-800" }, "Como funciona o rateio \uFFFD livro aberto"), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-100 rounded-2xl p-4 sm:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "Seu m\uFFFDs at\uFFFD agora (", myProgress.month, ")"), /* @__PURE__ */ React.createElement("ul", { className: "text-sm text-slate-700 space-y-1.5" }, /* @__PURE__ */ React.createElement("li", null, "Consultas v\uFFFDlidas: ", myProgress.validConsults, " de ", rules.minValidConsults, " necess\uFFFDrias"), myProgress.pendingRefundWindow > 0 && /* @__PURE__ */ React.createElement("li", null, "+", myProgress.pendingRefundWindow, " consulta(s) aguardando a janela de estorno de", " ", rules.refundWindowDays, " dias"), /* @__PURE__ */ React.createElement("li", null, myProgress.avgRating != null ? `Sua nota m\uFFFDdia: ${fmtRating(myProgress.avgRating)}` : "Voc\uFFFD ainda n\uFFFDo recebeu avalia\uFFFD\uFFFDes \uFFFD sem nota, seu multiplicador \uFFFD neutro (1,0)"), /* @__PURE__ */ React.createElement("li", null, myProgress.qualified ? "? Voc\uFFFD est\uFFFD qualificado para o rateio deste m\uFFFDs" : `Faltam ${remaining} consultas v\uFFFDlidas para voc\uFFFD participar do rateio deste m\uFFFDs`)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "h-2.5 rounded-full bg-white/80 overflow-hidden border border-brand-100" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all",
      style: { width: `${progressPct}%` }
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(AccordionBlock, { title: "De onde vem o dinheiro do pote" }, /* @__PURE__ */ React.createElement("p", null, "De cada consulta paga na plataforma, ", pct(rules.commissionRate), "% viram comiss\uFFFDo. Essa comiss\uFFFDo n\uFFFDo \uFFFD lucro da Doctor8: ela paga os custos de manter o sistema funcionando (servidores, v\uFFFDdeo, mensagens, intelig\uFFFDncia artificial) e o que sobra volta para os profissionais no fim do m\uFFFDs. Custos e sobras ficam vis\uFFFDveis para todos nesta p\uFFFDgina \uFFFD por isso chamamos de livro aberto.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que \uFFFD uma consulta v\uFFFDlida" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Para entrar na conta do rateio, a consulta precisa:"), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "ter sido paga de verdade (pagamento confirmado, n\uFFFDo pendente);"), /* @__PURE__ */ React.createElement("li", null, "ter passado a janela de estorno de ", rules.refundWindowDays, " dias \uFFFD se o paciente for reembolsado, ela n\uFFFDo conta;"), /* @__PURE__ */ React.createElement("li", null, "ser de um paciente real e distinto \uFFFD consultas artificiais s\uFFFDo detectadas e descartadas.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "No Plant\uFFFDo Online, chamadas com menos de ", rules.shortCallSeconds, " segundos passam por revis\uFFFDo antes de contar.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "O que voc\uFFFD precisa para participar do m\uFFFDs" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Pelo menos ", rules.minValidConsults, " consultas v\uFFFDlidas no m\uFFFDs;"), /* @__PURE__ */ React.createElement("li", null, "Nota m\uFFFDdia de pelo menos ", fmtRating(rules.minRating), " (se voc\uFFFD ainda n\uFFFDo tem avalia\uFFFD\uFFFDes, isso n\uFFFDo te desqualifica).")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Quem n\uFFFDo atinge os m\uFFFDnimos em um m\uFFFDs continua contribuindo para o pote, e volta a participar assim que atingir \uFFFD as regras recome\uFFFDam do zero todo m\uFFFDs.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Como o pote \uFFFD dividido" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "Pote do m\uFFFDs = comiss\uFFFDes arrecadadas ? custos do sistema (nunca negativo)."), /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, pct(rules.baseFraction), "% do pote: dividido em partes iguais entre todos os qualificados do m\uFFFDs."), /* @__PURE__ */ React.createElement("li", null, pct(rules.meritFraction), "% do pote: dividido por m\uFFFDrito, proporcional ao seu score.")), /* @__PURE__ */ React.createElement("p", { className: "mt-2" }, "Score = consultas v\uFFFDlidas \uFFFD multiplicador de qualidade.", /* @__PURE__ */ React.createElement("br", null), "O multiplicador vem da sua nota m\uFFFDdia: nota ", fmtRating(rules.minRating), " vale", " ", fmtMult(rules.ratingMultiplierAtMin), "\uFFFD, nota 5,0 vale ", fmtMult(rules.qualityMax), "\uFFFD, sempre entre", " ", fmtMult(rules.qualityMin), " e ", fmtMult(rules.qualityMax), ". Sem avalia\uFFFD\uFFFDes, vale 1,0 (neutro).", /* @__PURE__ */ React.createElement("br", null), "Exemplo: 20 consultas v\uFFFDlidas com nota 4,5 ? multiplicador 1,1 ? score 22.")), /* @__PURE__ */ React.createElement(AccordionBlock, { title: "Regras de prote\uFFFD\uFFFDo e compromissos" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Sinais objetivos: usamos o pagamento real (Stripe), a dura\uFFFD\uFFFDo real da chamada e a identidade do paciente para validar \uFFFD n\uFFFDo d\uFFFD para inflar n\uFFFDmeros artificialmente."), /* @__PURE__ */ React.createElement("li", null, "Casos suspeitos passam por revis\uFFFDo humana antes de qualquer exclus\uFFFDo."), /* @__PURE__ */ React.createElement("li", null, "Mudan\uFFFDas de regra valem apenas para os meses seguintes, nunca retroativamente."), /* @__PURE__ */ React.createElement("li", null, "Este livro aberto \uFFFD um compromisso da Doctor8: os mesmos n\uFFFDmeros que voc\uFFFD v\uFFFD aqui s\uFFFDo os usados no c\uFFFDlculo.")))));
}
function RateioRulesPanel() {
  const [rules, setRules] = useState4(null);
  const [myProgress, setMyProgress] = useState4(null);
  const [loading, setLoading] = useState4(true);
  useEffect4(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/professional/financeiro/rateio");
        if (!res.ok) {
          console.warn("[RateioRules] API error:", res.status);
          return;
        }
        const data = await res.json();
        if (!data.rules || !data.myProgress) {
          console.warn("[RateioRules] Missing rules or myProgress in API response");
          return;
        }
        if (!cancelled) {
          setRules(data.rules);
          setMyProgress(data.myProgress);
        }
      } catch (e) {
        console.warn("[RateioRules] Failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-8" }, /* @__PURE__ */ React.createElement(Loader23, { size: 20, className: "animate-spin text-slate-300" }));
  }
  if (!rules || !myProgress) return null;
  return /* @__PURE__ */ React.createElement(RateioRules, { rules, myProgress });
}

// src/app/(dashboard)/professional/financeiro/RateioInfoSection.tsx
import { Info as Info2 } from "lucide-react";
function RateioInfoSection() {
  const t = useT();
  return /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0" }, /* @__PURE__ */ React.createElement(Info2, { size: 18, className: "text-slate-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-slate-900 text-sm" }, t("rateio.unavailableTitle")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-1 leading-relaxed" }, t("rateio.unavailableDesc")))));
}

// src/app/(dashboard)/professional/financeiro/StripeConnectCard.tsx
import { useCallback as useCallback3, useEffect as useEffect5, useState as useState5 } from "react";
import {
  CreditCard,
  Loader2 as Loader24,
  AlertCircle as AlertCircle2,
  CheckCircle2 as CheckCircle23,
  RefreshCw as RefreshCw2,
  ExternalLink
} from "lucide-react";
function StripeConnectCard({ mode = "full" }) {
  const t = useT();
  const [status, setStatus] = useState5(null);
  const [loading, setLoading] = useState5(true);
  const [submitting, setSubmitting] = useState5(false);
  const [error, setError] = useState5("");
  const loadStatus = useCallback3(async () => {
    if (mode === "unavailable") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/professional/stripe-connect/status");
      if (res.status === 503) {
        setStatus(null);
        return;
      }
      if (!res.ok) {
        setError(t("connect.error"));
        return;
      }
      const data = await res.json();
      setStatus(data.status);
    } catch {
      setError(t("connect.error"));
    } finally {
      setLoading(false);
    }
  }, [mode, t]);
  useEffect5(() => {
    void loadStatus();
  }, [loadStatus]);
  async function handleOnboard() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/professional/stripe-connect/onboard", { method: "POST" });
      if (!res.ok) {
        setError(t("connect.error"));
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t("connect.error"));
    } finally {
      setSubmitting(false);
    }
  }
  if (mode === "unavailable") {
    return /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0" }, /* @__PURE__ */ React.createElement(CreditCard, { size: 18, className: "text-slate-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-slate-900 text-sm" }, t("connect.title")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, t("connect.unavailableDesc")))));
  }
  const statusLabel = status ? t(`connect.status.${status}`) : "";
  const showCta = status === "none" || status === "onboarding_incomplete" || status === "pending";
  const ctaLabel = status === "none" ? t("connect.cta.connect") : t("connect.cta.resume");
  return /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0" }, /* @__PURE__ */ React.createElement(CreditCard, { size: 18, className: "text-brand-500" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-slate-900 text-sm" }, t("connect.title")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, t("connect.subtitle")), loading ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-2 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Loader24, { size: 12, className: "animate-spin" }), " ", t("connect.loading")) : status === "active" ? /* @__PURE__ */ React.createElement("span", { className: "connect-badge-active inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700" }, /* @__PURE__ */ React.createElement(CheckCircle23, { size: 12 }), " ", t("connect.badge.active")) : status ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-2 font-medium" }, statusLabel) : null)), !loading && showCta && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => void handleOnboard(),
      disabled: submitting,
      className: "connect-cta-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60 transition shrink-0"
    },
    submitting ? /* @__PURE__ */ React.createElement(Loader24, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(ExternalLink, { size: 14 }),
    ctaLabel
  )), error && /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex items-center gap-2 text-xs text-rose-700" }, /* @__PURE__ */ React.createElement(AlertCircle2, { size: 14, className: "shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "flex-1" }, error), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => void loadStatus(),
      className: "font-semibold flex items-center gap-1 hover:underline shrink-0"
    },
    /* @__PURE__ */ React.createElement(RefreshCw2, { size: 12 }),
    " ",
    t("common.retry")
  )));
}

// src/lib/finance-display.ts
function financeTypeLabel(type, t) {
  switch (type) {
    case "TELECONSULT":
      return t("fin.typeTeleconsult");
    case "IN_PERSON":
      return t("fin.typeInPerson");
    case "JIT":
      return t("fin.typeJit");
    default:
      return type;
  }
}
var FINANCE_TYPE_COLORS = {
  TELECONSULT: "bg-brand-100 text-brand-600",
  IN_PERSON: "bg-purple-100 text-purple-700",
  JIT: "bg-brand-100 text-brand-600"
};

// src/lib/stripe-connect.ts
init_db();

// src/lib/stripe.ts
import Stripe from "stripe";
var stripeInstance = null;
var stripe = new Proxy({}, {
  get(_target, prop) {
    if (!stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
      stripeInstance = new Stripe(key, { apiVersion: "2024-06-20", typescript: true });
    }
    return stripeInstance[prop];
  }
});

// src/lib/email-core.ts
import { Resend } from "resend";

// src/lib/psychologist-portal.ts
init_db();

// src/lib/stripe-connect.ts
function isStripeConnectEnabled() {
  const raw = process.env.STRIPE_CONNECT_ENABLED;
  if (raw === void 0 || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

// src/app/(dashboard)/professional/financeiro/page.tsx
function fmt(cents, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "BRL"
  }).format(cents / 100);
}
function fmtDate(iso, locale) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
var PERIOD_KEYS = {
  this_month: "fin.periodThisMonth",
  last_month: "fin.periodLastMonth",
  "3_months": "fin.period3Months",
  "6_months": "fin.period6Months",
  this_year: "fin.periodThisYear",
  all: "fin.periodAll"
};
var TYPE_ICONS = {
  TELECONSULT: /* @__PURE__ */ React.createElement(Stethoscope, { size: 14 }),
  IN_PERSON: /* @__PURE__ */ React.createElement(MapPin, { size: 14 }),
  JIT: /* @__PURE__ */ React.createElement(Radio, { size: 14 })
};
function BarChart({
  data,
  currency,
  locale,
  emptyText,
  legendNet,
  legendComm,
  consultLabel,
  netLabel,
  grossLabel
}) {
  if (!data.length) return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-40 text-slate-400 text-sm" }, emptyText);
  const maxNet = Math.max(...data.map((d) => d.net), 1);
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-end gap-2 h-40" }, data.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1 flex flex-col items-center gap-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex flex-col items-center justify-end h-32 gap-0.5" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-full bg-brand-100 rounded-t-sm",
      style: { height: `${Math.round(d.gross / maxNet * 100)}%`, minHeight: d.gross > 0 ? 4 : 0 }
    }
  ))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-end gap-1.5 h-36 px-1" }, data.map((d, i) => {
    const netH = maxNet > 0 ? Math.max(d.net / maxNet * 128, d.net > 0 ? 4 : 0) : 0;
    const commH = maxNet > 0 ? Math.max((d.commissionCents ?? d.gross - d.net) / maxNet * 128, 0) : 0;
    return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1 flex flex-col items-center justify-end gap-0 group relative min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, d.label), /* @__PURE__ */ React.createElement("p", null, netLabel, ": ", fmt(d.net, currency, locale)), /* @__PURE__ */ React.createElement("p", null, grossLabel, ": ", fmt(d.gross, currency, locale)), /* @__PURE__ */ React.createElement("p", null, consultLabel(d.count))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-full bg-rose-200 rounded-t-none",
        style: { height: Math.round(commH) }
      }
    ), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-full bg-brand-500 rounded-t-sm",
        style: { height: Math.round(netH) }
      }
    ));
  })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5 px-1" }, data.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1 text-center text-[10px] text-slate-400 truncate min-w-0" }, d.label))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 justify-center mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 rounded-sm bg-brand-500" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-500" }, legendNet)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 rounded-sm bg-rose-200" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-500" }, legendComm))));
}
function FinanceiroDashboard({
  apiPath = "/api/professional/financeiro",
  showPricingSettings = true,
  showRateio = true,
  rateioMode = "full",
  stripeConnectEnabled = false,
  stripeConnectMode = "full",
  pricingSettingsProps
}) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [period, setPeriod] = useState6("this_month");
  const [data, setData] = useState6(null);
  const [loading, setLoading] = useState6(true);
  const [error, setError] = useState6("");
  const [showAll, setShowAll] = useState6(false);
  const loadData = useCallback4(async (p) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiPath}?period=${p}`);
      if (!res.ok) {
        setError(t("common.loadError"));
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
      setError(t("common.loadError"));
    }
    setLoading(false);
  }, [t, apiPath]);
  useEffect6(() => {
    loadData(period);
  }, [period, loadData]);
  const currency = data?.currency || "BRL";
  const txVisible = showAll ? data?.transactions || [] : (data?.transactions || []).slice(0, 10);
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto space-y-6 pb-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between flex-wrap gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-slate-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(TrendingUp, { size: 24, className: "text-brand-500" }), " ", t("fin.title")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-500 text-sm mt-1" }, t("fin.subtitle"))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: period,
      onChange: (e) => setPeriod(e.target.value),
      className: "appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shadow-sm cursor-pointer"
    },
    Object.entries(PERIOD_KEYS).map(([v, key]) => /* @__PURE__ */ React.createElement("option", { key: v, value: v }, t(key)))
  ), /* @__PURE__ */ React.createElement(ChevronDown2, { size: 15, className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" }))), showPricingSettings && /* @__PURE__ */ React.createElement(ConsultPricingSettings, { ...pricingSettingsProps }), stripeConnectEnabled && /* @__PURE__ */ React.createElement(StripeConnectCard, { mode: stripeConnectMode }), error && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement(AlertCircle3, { size: 16, className: "shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "flex-1" }, error), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => loadData(period),
      className: "text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline shrink-0"
    },
    /* @__PURE__ */ React.createElement(RefreshCw3, { size: 13 }),
    " ",
    t("common.retry")
  )), loading ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-24" }, /* @__PURE__ */ React.createElement(Loader25, { size: 28, className: "animate-spin text-slate-400" })) : data ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 col-span-2 lg:col-span-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide" }, t("fin.netEarnings")), /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(DollarSign2, { size: 15, className: "text-brand-500" }))), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-slate-900" }, fmt(data.totalNetCents, currency, locale)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, t("fin.afterCommission"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide" }, t("fin.grossTotal")), /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 15, className: "text-brand-500" }))), /* @__PURE__ */ React.createElement("p", { className: "text-xl font-bold text-slate-900" }, fmt(data.totalGrossCents, currency, locale)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, t("fin.totalCharged"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide" }, t("fin.commission")), /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Percent, { size: 15, className: "text-rose-600" }))), /* @__PURE__ */ React.createElement("p", { className: "text-xl font-bold text-slate-900" }, fmt(data.totalCommissionCents, currency, locale)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, t("fin.commissionHint"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide" }, t("fin.consultations")), /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(FileText, { size: 15, className: "text-purple-600" }))), /* @__PURE__ */ React.createElement("p", { className: "text-xl font-bold text-slate-900" }, data.totalCount), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, t("fin.inPeriod")))), data.projectionCents != null && data.projectionCents > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white flex items-center justify-between gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold opacity-90 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Calendar, { size: 15 }), " ", t("fin.projectionTitle")), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-bold mt-1" }, fmt(data.projectionCents, currency, locale)), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-70 mt-1" }, t("fin.projectionHint"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white/20 rounded-xl px-4 py-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold" }, data.projectionCents > 0 ? `+${Math.round((data.projectionCents - data.totalNetCents) / Math.max(data.totalNetCents, 1) * 100)}%` : "\u2014"), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80" }, t("fin.projectionRemaining")))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-700 flex items-center gap-2 mb-4" }, /* @__PURE__ */ React.createElement(BarChart3, { size: 16, className: "text-brand-500" }), " ", t("fin.monthlyChart")), /* @__PURE__ */ React.createElement(
    BarChart,
    {
      data: data.chartData.map((d) => ({ label: d.label, net: d.net, gross: d.gross, count: d.count, commissionCents: d.gross - d.net })),
      currency,
      locale,
      emptyText: t("fin.noChartData"),
      legendNet: t("fin.legendNet"),
      legendComm: t("fin.legendCommission"),
      netLabel: t("fin.net"),
      grossLabel: t("fin.gross"),
      consultLabel: (n) => n === 1 ? t("fin.oneConsult") : t("fin.nConsults").replace("{{n}}", String(n))
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-700 mb-4" }, t("fin.byType")), Object.keys(data.byType).length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-400 text-center py-8" }, t("fin.noData")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, Object.entries(data.byType).map(([type, info]) => {
    const pct2 = data.totalNetCents > 0 ? Math.round(info.netCents / data.totalNetCents * 100) : 0;
    return /* @__PURE__ */ React.createElement("div", { key: type }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}` }, TYPE_ICONS[type], " ", financeTypeLabel(type, t)), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-500" }, info.count === 1 ? t("fin.oneConsult") : t("fin.nConsults").replace("{{n}}", String(info.count)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-2 bg-slate-100 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full bg-brand-500 rounded-full", style: { width: `${pct2}%` } })), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-700 w-16 text-right" }, fmt(info.netCents, currency, locale))));
  }), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t border-slate-100 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, t("fin.grossTotal")), /* @__PURE__ */ React.createElement("span", null, fmt(data.totalGrossCents, currency, locale))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs text-rose-600" }, /* @__PURE__ */ React.createElement("span", null, t("fin.commissionPct")), /* @__PURE__ */ React.createElement("span", null, "\u2212 ", fmt(data.totalCommissionCents, currency, locale))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-sm font-bold text-brand-600 pt-1 border-t border-slate-100" }, /* @__PURE__ */ React.createElement("span", null, t("fin.yourNet")), /* @__PURE__ */ React.createElement("span", null, fmt(data.totalNetCents, currency, locale))))))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement(Info3, { size: 14, className: "shrink-0 mt-0.5 text-slate-400" }), /* @__PURE__ */ React.createElement("p", null, t("fin.commissionNote"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 border-b border-slate-100 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FileText, { size: 16, className: "text-slate-400" }), " ", t("fin.transactions"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-slate-400" }, "(", data.transactions.length, ")"))), data.transactions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "py-16 text-center" }, /* @__PURE__ */ React.createElement(DollarSign2, { size: 36, className: "text-slate-200 mx-auto mb-3" }), /* @__PURE__ */ React.createElement("p", { className: "text-slate-400 text-sm" }, t("fin.noTransactions")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-300 text-xs mt-1" }, t("fin.noTransactionsHint"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "hidden sm:grid grid-cols-12 gap-2 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide" }, /* @__PURE__ */ React.createElement("div", { className: "col-span-2" }, t("fin.colDate")), /* @__PURE__ */ React.createElement("div", { className: "col-span-3" }, t("fin.colType")), /* @__PURE__ */ React.createElement("div", { className: "col-span-1 text-center" }, t("fin.colPatient")), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right" }, t("fin.gross")), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right text-rose-500" }, t("fin.commissionShort")), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right text-brand-500" }, t("fin.net"))), /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-slate-100" }, txVisible.map((tx) => /* @__PURE__ */ React.createElement("div", { key: tx.id, className: "px-5 py-3 hover:bg-slate-50 transition" }, /* @__PURE__ */ React.createElement("div", { className: "sm:hidden flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}` }, TYPE_ICONS[tx.type], " ", financeTypeLabel(tx.type, t))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, fmtDate(tx.date, locale))), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-brand-600" }, fmt(tx.netCents, tx.currency, locale)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, t("fin.fromGross").replace("{{amount}}", fmt(tx.grossCents, tx.currency, locale))))), /* @__PURE__ */ React.createElement("div", { className: "hidden sm:grid grid-cols-12 gap-2 items-center" }, /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-xs text-slate-500" }, fmtDate(tx.date, locale)), /* @__PURE__ */ React.createElement("div", { className: "col-span-3" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}` }, TYPE_ICONS[tx.type], " ", financeTypeLabel(tx.type, t))), /* @__PURE__ */ React.createElement("div", { className: "col-span-1 flex justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500" }, tx.patientInitials)), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right text-sm text-slate-600" }, fmt(tx.grossCents, tx.currency, locale)), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right text-sm text-rose-500" }, "\u2212 ", fmt(tx.commissionCents, tx.currency, locale)), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 text-right text-sm font-bold text-brand-600" }, fmt(tx.netCents, tx.currency, locale)))))), data.transactions.length > 10 && /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 border-t border-slate-100 text-center" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAll((v) => !v),
      className: "text-sm text-brand-500 hover:text-brand-600 font-semibold"
    },
    showAll ? t("fin.showLess") : t("fin.showAllTx").replace("{{n}}", String(data.transactions.length))
  )))), showRateio && rateioMode === "info" && /* @__PURE__ */ React.createElement(RateioInfoSection, null), showRateio && rateioMode === "full" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RateioSection, { currency }), /* @__PURE__ */ React.createElement(RateioRulesPanel, null))) : null);
}
function ProfessionalFinanceiroPage() {
  return /* @__PURE__ */ React.createElement(FinanceiroDashboard, { stripeConnectEnabled: isStripeConnectEnabled() });
}
export {
  FinanceiroDashboard,
  ProfessionalFinanceiroPage as default
};
