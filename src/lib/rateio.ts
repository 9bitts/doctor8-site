// src/lib/rateio.ts
// Núcleo PURO do rateio / livro aberto (sem acesso a banco).
// Toda a matemática e as regras vivem aqui, para ficarem testáveis e auditáveis.
// A orquestração (ler/gravar no banco) fica em src/app/api/admin/rateio/route.ts.

import { createHash } from "crypto";

// ── Parâmetros padrão (podem ser sobrescritos por PoolPeriod) ─────────────────
export const COMMISSION_RATE = 0.15;          // 15% — igual ao já usado no sistema
export const DEFAULT_BASE_FRACTION = 0.30;    // 30% do pote dividido igualmente
export const DEFAULT_MERIT_FRACTION = 0.70;   // 70% por score
export const DEFAULT_MIN_VALID_CONSULTS = 10; // mínimo para qualificar
export const DEFAULT_MIN_RATING = 3.5;        // nota mínima para entrar no pote
export const REFUND_WINDOW_DAYS = 7;          // janela de estorno antes de contar
export const SHORT_CALL_SECONDS = 180;        // chamada curta demais → revisão (só Plantão)
export const QUALITY_MIN = 0.8;               // piso do multiplicador
export const QUALITY_MAX = 1.2;               // teto do multiplicador

// ── Comissão (15% do bruto, arredondada) ──────────────────────────────────────
export function commissionCentsOf(grossCents: number): number {
  return Math.round(grossCents * COMMISSION_RATE);
}

// ── Multiplicador de qualidade a partir da nota média ─────────────────────────
// Sem avaliações → 1.0 (neutro). Com nota, mapeia 3.5→0.9 ... 5.0→1.2, com clamp.
export function qualityMultiplier(avgRating: number | null | undefined): number {
  if (avgRating == null) return 1.0;
  // reta: 0.9 em 3.5 sobe até 1.2 em 5.0  →  m = 0.9 + (rating - 3.5) * 0.2
  const m = 0.9 + (avgRating - 3.5) * 0.2;
  return clamp(m, QUALITY_MIN, QUALITY_MAX);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Score de um profissional no mês ───────────────────────────────────────────
export function scoreOf(validConsults: number, qualityMult: number): number {
  return validConsults * qualityMult;
}

// ── Pote do mês: máx(0, comissão − custos) ────────────────────────────────────
export function poolCentsOf(commissionCents: number, costFixedCents: number, costUsageCents: number): number {
  return Math.max(0, commissionCents - costFixedCents - costUsageCents);
}

// ── Tipos para a divisão ──────────────────────────────────────────────────────
export interface ContributionInput {
  professionalId: string;
  validConsults: number;
  avgRating: number | null;
  qualified: boolean;     // já decidido por elegibilidade (mínimos)
}

export interface ContributionOutput {
  professionalId: string;
  validConsults: number;
  ratingUsed: number | null;
  qualityMult: number;
  score: number;
  qualified: boolean;
  baseCents: number;
  meritCents: number;
  totalCents: number;
}

// ── Divisão do pote: base (igual) + mérito (por score) ────────────────────────
// Resolve o "igual E por trabalho": piso igual para todos os qualificados +
// fatia por mérito proporcional ao score. Sobras de centavo vão para os maiores
// scores, de forma determinística (sem perder nem criar centavo).
export function splitPool(
  poolCents: number,
  inputs: ContributionInput[],
  baseFraction = DEFAULT_BASE_FRACTION,
  meritFraction = DEFAULT_MERIT_FRACTION,
): ContributionOutput[] {
  const outputs: ContributionOutput[] = inputs.map((i) => {
    const qm = qualityMultiplier(i.avgRating);
    return {
      professionalId: i.professionalId,
      validConsults: i.validConsults,
      ratingUsed: i.avgRating,
      qualityMult: qm,
      score: i.qualified ? scoreOf(i.validConsults, qm) : 0,
      qualified: i.qualified,
      baseCents: 0,
      meritCents: 0,
      totalCents: 0,
    };
  });

  const qualified = outputs.filter((o) => o.qualified);
  if (poolCents <= 0 || qualified.length === 0) return outputs;

  const basePool = Math.floor(poolCents * baseFraction);
  const meritPool = poolCents - basePool; // o resto vai pro mérito (sem perder centavo)

  // Base: igual entre qualificados
  const baseEach = Math.floor(basePool / qualified.length);
  qualified.forEach((o) => { o.baseCents = baseEach; });

  // Mérito: proporcional ao score
  const totalScore = qualified.reduce((s, o) => s + o.score, 0);
  if (totalScore > 0) {
    qualified.forEach((o) => {
      o.meritCents = Math.floor((meritPool * o.score) / totalScore);
    });
  }

  // Distribui as sobras de centavo (do floor) para os maiores scores
  qualified.forEach((o) => { o.totalCents = o.baseCents + o.meritCents; });
  let distributed = qualified.reduce((s, o) => s + o.totalCents, 0);
  let leftover = poolCents - distributed;
  const byScoreDesc = [...qualified].sort(
    (a, b) => b.score - a.score || a.professionalId.localeCompare(b.professionalId),
  );
  let idx = 0;
  while (leftover > 0 && byScoreDesc.length > 0) {
    byScoreDesc[idx % byScoreDesc.length].meritCents += 1;
    byScoreDesc[idx % byScoreDesc.length].totalCents += 1;
    leftover -= 1;
    idx += 1;
  }

  return outputs;
}

// ── Elegibilidade ─────────────────────────────────────────────────────────────
// Qualifica se bateu o mínimo de consultas válidas E a nota mínima.
// Sem avaliações ainda → não reprova por nota (profissional novo não é punido).
export function isEligible(
  validConsults: number,
  avgRating: number | null,
  minValidConsults = DEFAULT_MIN_VALID_CONSULTS,
  minRating = DEFAULT_MIN_RATING,
): { qualified: boolean; reason: string | null } {
  if (validConsults < minValidConsults) {
    return { qualified: false, reason: `Abaixo do mínimo de ${minValidConsults} consultas válidas (${validConsults}).` };
  }
  if (avgRating != null && avgRating < minRating) {
    return { qualified: false, reason: `Nota média ${avgRating.toFixed(2)} abaixo do mínimo de ${minRating}.` };
  }
  return { qualified: true, reason: null };
}

// ── Hash do ledger (encadeamento imutável) ────────────────────────────────────
// hash = sha256(prevHash + campos canônicos). Reescrever o passado quebra a cadeia.
export interface LedgerHashInput {
  type: string;
  category: string | null;
  amountCents: number;
  currency: string;
  competenceMonth: string;
  source: string;
  sourceRef: string | null;
  appointmentId: string | null;
  jitQueueId: string | null;
  occurredAt: string; // ISO
}

export function ledgerHash(prevHash: string | null, e: LedgerHashInput): string {
  const canonical = [
    prevHash ?? "GENESIS",
    e.type, e.category ?? "", e.amountCents, e.currency, e.competenceMonth,
    e.source, e.sourceRef ?? "", e.appointmentId ?? "", e.jitQueueId ?? "", e.occurredAt,
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

// ── Janela de estorno ─────────────────────────────────────────────────────────
export function isOutsideRefundWindow(paidAt: Date, now: Date, days = REFUND_WINDOW_DAYS): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return now.getTime() - paidAt.getTime() >= ms;
}

// ── Limites de mês "YYYY-MM" → [from, toExclusive) ────────────────────────────
export function monthBounds(month: string): { from: Date; toExclusive: Date } {
  const [y, m] = month.split("-").map(Number);
  return { from: new Date(y, m - 1, 1), toExclusive: new Date(y, m, 1) };
}
