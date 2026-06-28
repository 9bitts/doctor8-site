"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check, Loader2, ShieldCheck, Sparkles, X, Stamp,
  AlertCircle, CheckCircle2, Clock, CreditCard,
} from "lucide-react";
import {
  CLUB_BILLING_REGION_OPTIONS,
  parseBillingRegion,
  regionsMismatch,
  billingRegionLabel,
  patientRegionMismatchMessage,
  PATIENT_ACCOUNT_PATH,
  type BillingRegion,
} from "@/lib/billing-regions";
import { readApiJson, apiErrorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface SubInfo {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface StampInfo {
  balance: number;
  stampsToFreeMonth: number;
  readyForFreeMonth: boolean;
  kindsInWindowLabels: string[];
  kindsNeededForBonus: number;
  stampsForFreeMonth: number;
}

const ACTIVE = ["active", "trialing"];

function subscriptionStatus(sub: SubInfo | null): {
  label: string;
  detail: string;
  tone: "emerald" | "amber" | "rose" | "slate";
} {
  if (!sub || sub.status === "inactive") {
    return {
      label: "Não assinante",
      detail: "Você ainda não faz parte do Club Doctor.",
      tone: "slate",
    };
  }
  if (sub.status === "past_due") {
    return {
      label: "Pagamento pendente",
      detail: "Atualize o pagamento para manter os benefícios.",
      tone: "rose",
    };
  }
  if (sub.status === "cancelled") {
    return {
      label: "Assinatura encerrada",
      detail: "Renove quando quiser voltar ao Club.",
      tone: "slate",
    };
  }
  if (ACTIVE.includes(sub.status) && sub.cancelAtPeriodEnd) {
    return {
      label: "Ativo — cancelando",
      detail: sub.currentPeriodEnd
        ? `Benefícios até ${new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}.`
        : "Cancelamento agendado para o fim do período.",
      tone: "amber",
    };
  }
  if (ACTIVE.includes(sub.status)) {
    return {
      label: "Em dia",
      detail: sub.currentPeriodEnd
        ? `Próxima cobrança em ${new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}.`
        : "Sua assinatura está ativa.",
      tone: "emerald",
    };
  }
  return {
    label: sub.status,
    detail: "Confira os detalhes abaixo.",
    tone: "slate",
  };
}

const toneClasses = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  rose: "bg-rose-50 border-rose-200 text-rose-800",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function ClubDoctorPanel() {
  const { t } = useI18n();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [stamps, setStamps] = useState<StampInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"info" | "error" | "warning">("info");
  const [billingRegion, setBillingRegion] = useState<BillingRegion>("US");
  const [profileRegion, setProfileRegion] = useState<BillingRegion>("US");

  const regionMismatch = regionsMismatch(profileRegion, billingRegion);
  const status = subscriptionStatus(sub);
  const isActive = sub && ACTIVE.includes(sub.status);
  const stampCount = stamps?.balance ?? 0;
  const target = stamps?.stampsForFreeMonth ?? 10;
  const selectedPrice =
    CLUB_BILLING_REGION_OPTIONS.find((o) => o.region === billingRegion)?.priceHint ?? "";

  const benefits = [
    "Cartão fidelidade: carimbos viram mensalidade grátis",
    "Acesso à plataforma Doctor8 e todos os serviços",
    "Clube de compras coletivas",
    "Descontos em medicamentos e exames (parceiros)",
    "Conteúdos educativos e suporte técnico",
    "Consultas cobradas pelo valor do profissional, sem desconto automático",
  ];

  useEffect(() => {
    load();
    fetch("/api/user/region")
      .then((r) => r.json())
      .then((d) => {
        if (d?.region) {
          const region = parseBillingRegion(d.region, "US");
          setProfileRegion(region);
          setBillingRegion(region);
        }
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      setMsgTone("info");
      setMsg("Bem-vindo ao Club Doctor! Sua assinatura foi confirmada.");
      window.history.replaceState({}, "", "/patient/club-doctor");
    }
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [subRes, stampRes] = await Promise.all([
        fetch("/api/payments/subscription"),
        fetch("/api/patient/club-stamps"),
      ]);
      const subData = await subRes.json();
      const stampData = stampRes.ok ? await stampRes.json() : null;
      setSub(subData.subscription || null);
      setStamps(stampData);
    } catch {
      setSub(null);
      setStamps(null);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    if (regionMismatch) {
      setMsgTone("warning");
      setMsg(patientRegionMismatchMessage());
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: billingRegion }),
      });
      const parsed = await readApiJson<{ checkoutUrl?: string; error?: string; code?: string }>(res);
      if (parsed.data?.checkoutUrl) {
        window.location.href = parsed.data.checkoutUrl;
        return;
      }
      setMsgTone(parsed.data?.code === "REGION_MISMATCH" ? "warning" : "error");
      setMsg(
        apiErrorMessage(parsed, t("billing.err.checkout"), {
          server: t("billing.err.server"),
          invalid: t("billing.err.invalid"),
        }),
      );
      setWorking(false);
    } catch {
      setMsgTone("error");
      setMsg(t("billing.err.connection"));
      setWorking(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancelar o Club Doctor? Você mantém os benefícios até o fim do período atual.")) return;
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", { method: "DELETE" });
      const d = await res.json();
      if (res.ok) {
        setMsgTone("info");
        setMsg("Seu Club Doctor será cancelado ao fim do período atual.");
        await load();
      } else {
        setMsgTone("error");
        setMsg(d.error || "Não foi possível cancelar.");
      }
    } catch {
      setMsgTone("error");
      setMsg("Erro de conexao.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Club Doctor</h1>
        <p className="text-slate-500 mt-1">
          Sua assinatura, carimbos e benefícios do clube.
        </p>
      </div>

      {/* Status */}
      <div className={`rounded-2xl border p-5 ${toneClasses[status.tone]}`}>
        <div className="flex items-start gap-3">
          {status.tone === "emerald" ? (
            <CheckCircle2 size={22} className="shrink-0 mt-0.5" />
          ) : status.tone === "rose" ? (
            <AlertCircle size={22} className="shrink-0 mt-0.5" />
          ) : (
            <Clock size={22} className="shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-base">{status.label}</p>
            <p className="text-sm mt-0.5 opacity-90">{status.detail}</p>
            <p className="text-xs mt-2 opacity-75">
              Regiao da conta: {billingRegionLabel(profileRegion)}
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={`text-sm rounded-xl px-4 py-3 border ${
            msgTone === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : msgTone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Stamp card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Stamp size={18} className="text-emerald-600" /> Seus carimbos
          </h2>
          <span className="text-2xl font-bold text-emerald-600">
            {stampCount} <span className="text-sm font-normal text-slate-400">/ {target}</span>
          </span>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                i < stampCount
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-200 text-slate-300"
              }`}
            >
              {i < stampCount ? <Check size={14} /> : i + 1}
            </div>
          ))}
        </div>

        {stamps?.readyForFreeMonth ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            Você tem {stampCount} carimbos! A próxima mensalidade do Club será gratuita automaticamente.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Faltam <strong>{stamps?.stampsToFreeMonth ?? target}</strong> carimbos para a próxima mensalidade grátis.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <p><strong>+1</strong> cada consulta paga e concluída (qualquer profissional)</p>
          <p><strong>+1</strong> cada mensalidade Club paga</p>
          <p>
            <strong>+1 bonus</strong> ao consultar 3 tipos diferentes de profissional em 12 meses
            {stamps && stamps.kindsNeededForBonus > 0 && (
              <> (faltam {stamps.kindsNeededForBonus})</>
            )}
          </p>
          {stamps && stamps.kindsInWindowLabels.length > 0 && (
            <p className="text-slate-400">
              Tipos já consultados: {stamps.kindsInWindowLabels.join(", ")}
            </p>
          )}
          <p className="text-slate-400">Carimbos não expiram. Crédito só na mensalidade, nunca em consultas.</p>
        </div>
      </div>

      {isActive ? (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {sub!.cancelAtPeriodEnd ? "Ativo - cancelando" : "Membro ativo"}
            </span>
          </div>
          <p className="text-3xl font-bold mb-2">Club Doctor</p>
          <p className="text-emerald-50 text-sm">
            {sub!.cancelAtPeriodEnd
              ? `Benefícios até ${
                  sub!.currentPeriodEnd
                    ? new Date(sub!.currentPeriodEnd).toLocaleDateString("pt-BR")
                    : "o fim do período"
                }.`
              : sub!.currentPeriodEnd
                ? `Renova em ${new Date(sub!.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                : "Assinatura ativa"}
          </p>

          {!sub!.cancelAtPeriodEnd && (
            <button
              type="button"
              onClick={cancel}
              disabled={working}
              className="mt-6 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              {working ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
              Cancelar assinatura
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" /> Assinar Club Doctor
          </h2>
          <p className="text-sm text-slate-500">
            Opcional e sem pressão — ajuda a Doctor8 a evoluir e libera o cartão fidelidade.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Moeda de cobranca
            </label>
            <select
              value={billingRegion}
              onChange={(e) => setBillingRegion(parseBillingRegion(e.target.value, billingRegion))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {CLUB_BILLING_REGION_OPTIONS.map((opt) => (
                <option key={opt.region} value={opt.region}>
                  {opt.labelPt} — {opt.priceHint}
                </option>
              ))}
            </select>
            {billingRegion === "BR" && !regionMismatch && (
              <p className="text-xs text-slate-500 mt-1.5">Cartao ou boleto no checkout.</p>
            )}
            {regionMismatch && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-2">
                <p>{patientRegionMismatchMessage()}</p>
                <Link href={PATIENT_ACCOUNT_PATH} className="inline-flex font-semibold underline">
                  Abrir Conta e alterar regiao
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {selectedPrice.replace("/mes", "")}
            </span>
            <span className="text-slate-500 text-sm mb-1">/mes</span>
          </div>

          <button
            type="button"
            onClick={subscribe}
            disabled={working || regionMismatch}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 justify-center"
          >
            {working ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Entrar no Club Doctor
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Beneficios do Club</h2>
        <ul className="space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-emerald-600" />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-5">
          O Club Doctor nao e plano de saude. Consultas sao cobradas pelo valor definido pelo profissional.
        </p>
      </div>
    </div>
  );
}
