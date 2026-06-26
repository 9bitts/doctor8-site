"use client";

// src/app/(dashboard)/professional/financeiro/RateioSection.tsx
// Segunda se??o do Financeiro: o LIVRO ABERTO (comiss?o ? custos = pote) + "o meu"
// (minha fatia do rateio do m?s) + hist?rico. L? de /api/professional/financeiro/rateio.
// Componente definido em arquivo pr?prio (fora da p?gina) ? evita o bug de foco do React.

import { useEffect, useState } from "react";
import {
  BookOpen, Loader2, Users, Award, TrendingDown, Sparkles, History, Info, CheckCircle2, XCircle,
} from "lucide-react";

// 컴 Tipos do payload da rota 컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴
interface CostLine {
  type: "COST_FIXED" | "COST_USAGE";
  category: string;
  source: string;
  amountCents: number;
}
interface Mine {
  validConsults: number;
  qualified: boolean;
  disqualReason: string | null;
  qualityMult: number;
  score: number;
  baseCents: number;
  meritCents: number;
  totalCents: number;
  payoutStatus: string;
}
interface LatestPeriod {
  month: string;
  currency: string;
  commissionCents: number;
  costFixedCents: number;
  costUsageCents: number;
  poolCents: number;
  baseFraction: number;
  meritFraction: number;
  lockedAt: string | null;
  professionalsCount: number;
  costBreakdown: CostLine[];
  mine: Mine | null;
}
interface HistoryItem {
  month: string;
  currency: string;
  poolCents: number;
  totalCents: number;
  qualified: boolean;
}
interface RateioData {
  latest: LatestPeriod | null;
  history: HistoryItem[];
}

// 컴 Helpers 컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴�
function fmt(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(cents / 100);
}
function fmtMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const CAT_LABELS: Record<string, string> = {
  AI_ANTHROPIC: "IA (Anthropic)",
  STORAGE_S3: "Armazenamento (S3)",
  PAYMENT_STRIPE: "Taxas de pagamento (Stripe)",
  VIDEO_DAILY: "V?deo (Daily)",
  INFRA_RAILWAY: "Infraestrutura (Railway)",
  EMAIL_RESEND: "E-mail (Resend)",
  CDN_CLOUDFLARE: "CDN (Cloudflare)",
  OTHER: "Outros",
};
const SOURCE_LABELS: Record<string, string> = {
  STRIPE_API: "Stripe (API)",
  AWS_API: "AWS (API)",
  ANTHROPIC: "Anthropic",
  DAILY: "Daily",
  RAILWAY: "Railway",
  RESEND: "Resend",
  CLOUDFLARE: "Cloudflare",
  MANUAL_INVOICE: "Fatura anexada",
  SYSTEM: "Sistema",
};

// 컴 Componente 컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴컴
export function RateioSection({ currency: fallbackCurrency }: { currency: string }) {
  const [data, setData] = useState<RateioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/professional/financeiro/rateio");
        if (!res.ok) { if (alive) setLoading(false); return; }
        const d = await res.json();
        if (alive) { setData(d); setLoading(false); }
      } catch { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const latest = data?.latest ?? null;
  const cur = latest?.currency || fallbackCurrency || "BRL";

  // Estado vazio: nenhum m?s fechado ainda
  if (!latest) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={18} className="text-brand-500" /> Livro aberto ? Rateio
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Aqui voc? vai acompanhar, de forma totalmente transparente, todo o caixa da comiss?o:
          o que entrou, os custos do sistema na fonte, e quanto do pote volta para voc?.
          O primeiro fechamento mensal ainda n?o aconteceu ? assim que ele rodar, o livro aparece aqui.
        </p>
      </div>
    );
  }

  const m = latest.mine;

  return (
    <div className="space-y-4">
      {/* Cabe?alho da se??o */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={18} className="text-brand-500" /> Livro aberto ? Rateio
        </h2>
        <span className="text-xs text-slate-400">
          {fmtMonth(latest.month)} ? fechado {latest.lockedAt ? new Date(latest.lockedAt).toLocaleDateString("pt-BR") : "?"}
        </span>
      </div>

      {/* 컴 "O meu" 컴 */}
      <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold opacity-90 flex items-center gap-1.5">
              <Sparkles size={15} /> Seu rateio em {fmtMonth(latest.month)}
            </p>
            {m && m.qualified ? (
              <>
                <p className="text-3xl font-bold mt-1">{fmt(m.totalCents, cur)}</p>
                <p className="text-xs opacity-80 mt-1">
                  base {fmt(m.baseCents, cur)} + m?rito {fmt(m.meritCents, cur)} ? {m.validConsults} consultas v?lidas
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold mt-1">N?o participou deste m?s</p>
                <p className="text-xs opacity-80 mt-1">{m?.disqualReason || "Sem consultas v?lidas no per?odo."}</p>
              </>
            )}
          </div>
          {m && (
            <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold flex items-center gap-1.5 justify-center">
                {m.qualified ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {m.qualified ? "Qualificado" : "?"}
              </p>
              <p className="text-xs opacity-80">multiplicador {m.qualityMult.toFixed(2)}?</p>
            </div>
          )}
        </div>
      </div>

      {/* 컴 O pote (livro aberto) 컴 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-500" /> De onde vem o pote ({latest.professionalsCount} profissionais)
        </h3>

        <div className="space-y-2 text-sm">
          {/* Comiss?o */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-2">
              Comiss?o arrecadada (15%)
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">fonte: Stripe</span>
            </span>
            <span className="font-semibold text-slate-800">{fmt(latest.commissionCents, cur)}</span>
          </div>

          {/* Custos detalhados */}
          {latest.costBreakdown.length > 0 && (
            <div className="pl-1 border-l-2 border-rose-100 space-y-1.5 my-2">
              {latest.costBreakdown.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-2">
                    <TrendingDown size={12} className="text-rose-400" />
                    {CAT_LABELS[c.category] || c.category}
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {c.type === "COST_FIXED" ? "fixo" : "uso"} ? {SOURCE_LABELS[c.source] || c.source}
                    </span>
                  </span>
                  <span className="text-rose-500">? {fmt(c.amountCents, cur)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Subtotais de custo */}
          <div className="flex items-center justify-between text-xs text-rose-500">
            <span>Total custos fixos</span><span>? {fmt(latest.costFixedCents, cur)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-rose-500">
            <span>Total custos de uso</span><span>? {fmt(latest.costUsageCents, cur)}</span>
          </div>

          {/* Pote */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award size={15} className="text-brand-500" /> Pote do rateio
            </span>
            <span className="text-lg font-bold text-brand-600">{fmt(latest.poolCents, cur)}</span>
          </div>
          <p className="text-[11px] text-slate-400 text-right">
            dividido em {Math.round(latest.baseFraction * 100)}% base (igual) + {Math.round(latest.meritFraction * 100)}% m?rito (por score)
          </p>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-start gap-2 text-[11px] text-slate-500">
          <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
          <p>
            Cada linha de custo aponta a fonte de onde o valor foi apurado. Os n?meros s?o auditados
            anualmente por um contador independente. O pote ? sempre m?x(0, comiss?o ? custos).
          </p>
        </div>
      </div>

      {/* 컴 Hist?rico 컴 */}
      {data && data.history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History size={15} className="text-slate-400" /> Hist?rico de rateios
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {data.history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 capitalize">{fmtMonth(h.month)}</p>
                  <p className="text-xs text-slate-400">pote do m?s: {fmt(h.poolCents, h.currency)}</p>
                </div>
                <span className={`text-sm font-bold ${h.qualified ? "text-brand-600" : "text-slate-400"}`}>
                  {h.qualified ? fmt(h.totalCents, h.currency) : "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
