// src/app/api/admin/rateio/route.ts
// Motor de rateio (orquestração). Protegido por header x-cron-secret == CRON_SECRET,
// ou por sessão de usuário ADMIN (para uso manual no painel).
//
// Ações (querystring ?action=...):
//   GET  ?action=preview&month=YYYY-MM&currency=BRL   → simula o pote SEM gravar
//   POST ?action=validate&month=...&currency=...      → grava ConsultationValidation
//   POST ?action=ledger&month=...&currency=...        → grava comissões no ledger (idempotente)
//   POST ?action=cost&...  (corpo JSON)               → lança um custo de máquina no ledger
//   POST ?action=close&month=...&currency=...         → fecha o pote + contribuições (LOCKED)
//   POST ?action=run&month=...&currency=...           → validate + ledger + close (job mensal)
//
// PHI nunca entra aqui: só valores, contagens e ids.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  commissionCentsOf, isOutsideRefundWindow, monthBounds, poolCentsOf,
  isEligible, splitPool, ledgerHash, SHORT_CALL_SECONDS,
  DEFAULT_BASE_FRACTION, DEFAULT_MERIT_FRACTION,
  DEFAULT_MIN_VALID_CONSULTS, DEFAULT_MIN_RATING,
  type ContributionInput,
} from "@/lib/rateio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Autorização ───────────────────────────────────────────────────────────────
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

function params(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  return {
    action: sp.get("action") || "",
    month: sp.get("month") || defaultMonth(),
    currency: sp.get("currency") || "BRL",
  };
}

function defaultMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// ── Coleta de consultas candidatas do mês/moeda ───────────────────────────────
interface Candidate {
  kind: "appt" | "jit";
  refId: string;            // appointmentId ou jitQueueId
  professionalId: string;
  professionalUserId: string | null;
  patientUserId: string | null;
  patientEmailVerified: boolean;
  grossCents: number;
  currency: string;
  paidAt: Date;
  callConnected: boolean;
  durationSeconds: number | null;
  hasClinicalRecord: boolean;
}

async function collectCandidates(month: string, currency: string): Promise<Candidate[]> {
  const { from, toExclusive } = monthBounds(month);
  const out: Candidate[] = [];

  // 1) Consultas agendadas pagas e concluídas
  const appts = await db.appointment.findMany({
    where: {
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency,
      professionalId: { not: null },
    },
    select: {
      id: true, priceAmount: true, currency: true, paidAt: true,
      professionalId: true,
      professional: { select: { userId: true } },
      patient: { select: { user: { select: { id: true, emailVerified: true } } } },
    },
  });

  // Registro clínico: existe MedicalDocument vinculado à consulta?
  const apptIds = appts.map((a) => a.id);
  const docs = apptIds.length
    ? await db.medicalDocument.findMany({
        where: { appointmentId: { in: apptIds } },
        select: { appointmentId: true },
      })
    : [];
  const withDoc = new Set(docs.map((d) => d.appointmentId).filter(Boolean) as string[]);

  for (const a of appts) {
    out.push({
      kind: "appt",
      refId: a.id,
      professionalId: a.professionalId as string,
      professionalUserId: a.professional?.userId ?? null,
      patientUserId: a.patient?.user?.id ?? null,
      patientEmailVerified: !!a.patient?.user?.emailVerified,
      grossCents: a.priceAmount || 0,
      currency: a.currency || currency,
      paidAt: a.paidAt as Date,
      callConnected: true,            // provisório (COMPLETED); endurecido depois via webhook Daily
      durationSeconds: null,          // sem duração real para agendadas hoje
      hasClinicalRecord: withDoc.has(a.id),
    });
  }

  // 2) Plantão Online pago
  const jits = await db.jitPayment.findMany({
    where: {
      status: "paid",
      currency,
      OR: [
        { paidAt: { not: null, gte: from, lt: toExclusive } },
        { paidAt: null, createdAt: { gte: from, lt: toExclusive } },
      ],
      queueEntry: { is: { session: { is: { professionalId: { not: undefined } } } } },
    },
    select: {
      id: true, amount: true, currency: true, paidAt: true, createdAt: true,
      queueEntry: {
        select: {
          id: true, startedAt: true, endedAt: true, patientUserId: true,
          patientUser: { select: { id: true, emailVerified: true } },
          session: { select: { professionalId: true, professional: { select: { userId: true } } } },
        },
      },
    },
  });

  for (const j of jits) {
    const q = j.queueEntry;
    if (!q || !q.session?.professionalId) continue;
    let dur: number | null = null;
    if (q.startedAt && q.endedAt) {
      dur = Math.max(0, Math.round((q.endedAt.getTime() - q.startedAt.getTime()) / 1000));
    }
    out.push({
      kind: "jit",
      refId: q.id,
      professionalId: q.session.professionalId,
      professionalUserId: q.session.professional?.userId ?? null,
      patientUserId: q.patientUser?.id ?? q.patientUserId ?? null,
      patientEmailVerified: !!q.patientUser?.emailVerified,
      grossCents: j.amount || 0,
      currency: j.currency || currency,
      paidAt: (j.paidAt ?? j.createdAt) as Date,
      callConnected: !!q.startedAt,
      durationSeconds: dur,
      hasClinicalRecord: false,       // Plantão não vincula documento no schema atual (não usado como gate)
    });
  }

  return out;
}

// ── Veredito de validade de uma consulta ──────────────────────────────────────
function evaluate(c: Candidate, now: Date) {
  const flags: string[] = [];

  const sameUser = !!c.patientUserId && c.patientUserId === c.professionalUserId;
  if (sameUser) flags.push("patient_eq_professional");
  if (!c.patientEmailVerified) flags.push("patient_email_unverified");

  let underReview = false;
  if (c.kind === "jit" && c.durationSeconds != null && c.durationSeconds < SHORT_CALL_SECONDS) {
    flags.push("short_call");
    underReview = true;
  }

  const paymentSettled = true; // candidatos já vêm filtrados como pagos
  const outsideRefundWindow = isOutsideRefundWindow(c.paidAt, now);
  const patientVerified = !!c.patientUserId && !sameUser && c.patientEmailVerified;

  const isValid =
    paymentSettled && outsideRefundWindow && patientVerified && c.callConnected && !underReview;

  return {
    paymentSettled, outsideRefundWindow, patientVerified,
    callConnected: c.callConnected, durationSeconds: c.durationSeconds,
    hasClinicalRecord: c.hasClinicalRecord,
    grossCents: c.grossCents, commissionCents: commissionCentsOf(c.grossCents),
    fraudFlags: flags, fraudScore: flags.length, underReview, isValid,
  };
}

// ── AÇÃO: validate ────────────────────────────────────────────────────────────
async function doValidate(month: string, currency: string) {
  const now = new Date();
  const cands = await collectCandidates(month, currency);
  let valid = 0;
  for (const c of cands) {
    const v = evaluate(c, now);
    if (v.isValid) valid++;
    const data = {
      professionalId: c.professionalId,
      competenceMonth: month,
      currency,
      paymentSettled: v.paymentSettled,
      outsideRefundWindow: v.outsideRefundWindow,
      patientVerified: v.patientVerified,
      callConnected: v.callConnected,
      durationSeconds: v.durationSeconds,
      hasClinicalRecord: v.hasClinicalRecord,
      grossCents: v.grossCents,
      commissionCents: v.commissionCents,
      fraudFlags: v.fraudFlags,
      fraudScore: v.fraudScore,
      underReview: v.underReview,
      isValid: v.isValid,
    };
    if (c.kind === "appt") {
      await db.consultationValidation.upsert({
        where: { appointmentId: c.refId },
        create: { appointmentId: c.refId, ...data },
        update: data,
      });
    } else {
      await db.consultationValidation.upsert({
        where: { jitQueueId: c.refId },
        create: { jitQueueId: c.refId, ...data },
        update: data,
      });
    }
  }
  return { candidates: cands.length, valid };
}

// ── AÇÃO: ledger (gravar comissões das consultas válidas, idempotente) ─────────
async function doLedger(month: string, currency: string) {
  const valids = await db.consultationValidation.findMany({
    where: { competenceMonth: month, currency, isValid: true },
    select: { appointmentId: true, jitQueueId: true, commissionCents: true, createdAt: true },
  });

  let written = 0;
  for (const v of valids) {
    const existing = await db.ledgerEntry.findFirst({
      where: {
        type: "COMMISSION_IN",
        ...(v.appointmentId ? { appointmentId: v.appointmentId } : { jitQueueId: v.jitQueueId }),
      },
      select: { id: true },
    });
    if (existing) continue;

    const last = await db.ledgerEntry.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const occurredAt = v.createdAt ?? new Date();
    const sourceRef = `commission:${v.appointmentId ? "appt" : "jit"}:${v.appointmentId ?? v.jitQueueId}`;
    const hash = ledgerHash(last?.hash ?? null, {
      type: "COMMISSION_IN", category: null, amountCents: v.commissionCents,
      currency, competenceMonth: month, source: "SYSTEM", sourceRef,
      appointmentId: v.appointmentId ?? null, jitQueueId: v.jitQueueId ?? null,
      occurredAt: occurredAt.toISOString(),
    });

    await db.ledgerEntry.create({
      data: {
        type: "COMMISSION_IN", category: null, amountCents: v.commissionCents,
        currency, competenceMonth: month, source: "SYSTEM", sourceRef,
        appointmentId: v.appointmentId ?? undefined, jitQueueId: v.jitQueueId ?? undefined,
        prevHash: last?.hash ?? null, hash, occurredAt,
      },
    });
    written++;
  }
  return { commissionsWritten: written };
}

// ── AÇÃO: cost (lançar um custo de máquina manualmente) ───────────────────────
async function doCost(req: NextRequest, month: string, currency: string) {
  const body = await req.json().catch(() => ({}));
  const type = body.type === "COST_FIXED" || body.type === "COST_USAGE" ? body.type : null;
  if (!type) return { error: "type deve ser COST_FIXED ou COST_USAGE" };
  const amountCents = Math.round(Number(body.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) return { error: "amountCents inválido" };
  const category = String(body.category || "OTHER");
  const source = String(body.source || "MANUAL_INVOICE");
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

  const last = await db.ledgerEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { hash: true } });
  const hash = ledgerHash(last?.hash ?? null, {
    type, category, amountCents, currency, competenceMonth: month, source,
    sourceRef: body.sourceRef ?? null, appointmentId: null, jitQueueId: null,
    occurredAt: occurredAt.toISOString(),
  });

  const entry = await db.ledgerEntry.create({
    data: {
      type, category: category as any, amountCents, currency, competenceMonth: month,
      source: source as any, sourceRef: body.sourceRef ?? null, invoiceUrl: body.invoiceUrl ?? null,
      prevHash: last?.hash ?? null, hash, occurredAt,
    },
    select: { id: true, hash: true },
  });
  return { ok: true, entry };
}

// ── Cálculo do pote (compartilhado por preview e close) ───────────────────────
async function computePool(month: string, currency: string) {
  const [commission, fixed, usage] = await Promise.all([
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COMMISSION_IN" } }),
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COST_FIXED" } }),
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COST_USAGE" } }),
  ]);
  const commissionCents = commission._sum.amountCents ?? 0;
  const costFixedCents = fixed._sum.amountCents ?? 0;
  const costUsageCents = usage._sum.amountCents ?? 0;
  const poolCents = poolCentsOf(commissionCents, costFixedCents, costUsageCents);

  // Profissionais com consultas válidas no mês/moeda
  const grouped = await db.consultationValidation.groupBy({
    by: ["professionalId"],
    where: { competenceMonth: month, currency, isValid: true },
    _count: { _all: true },
  });

  const inputs: ContributionInput[] = [];
  for (const g of grouped) {
    const agg = await db.professionalReview.aggregate({
      _avg: { rating: true },
      where: { professionalId: g.professionalId },
    });
    const avgRating = agg._avg.rating ?? null;
    const validConsults = g._count._all;
    const elig = isEligible(validConsults, avgRating);
    inputs.push({ professionalId: g.professionalId, validConsults, avgRating, qualified: elig.qualified });
  }

  const outputs = splitPool(poolCents, inputs);
  const eligByPro = new Map(inputs.map((i) => [i.professionalId, isEligible(i.validConsults, i.avgRating)]));

  return { commissionCents, costFixedCents, costUsageCents, poolCents, outputs, eligByPro };
}

// ── AÇÃO: preview (sem gravar) ────────────────────────────────────────────────
async function doPreview(month: string, currency: string) {
  const p = await computePool(month, currency);
  return {
    month, currency,
    commissionCents: p.commissionCents,
    costFixedCents: p.costFixedCents,
    costUsageCents: p.costUsageCents,
    poolCents: p.poolCents,
    baseFraction: DEFAULT_BASE_FRACTION,
    meritFraction: DEFAULT_MERIT_FRACTION,
    minValidConsults: DEFAULT_MIN_VALID_CONSULTS,
    minRating: DEFAULT_MIN_RATING,
    contributions: p.outputs.map((o) => ({
      ...o, disqualReason: o.qualified ? null : (p.eligByPro.get(o.professionalId)?.reason ?? null),
    })),
  };
}

// ── AÇÃO: close (grava PoolPeriod + PoolContribution, status LOCKED) ──────────
async function doClose(month: string, currency: string) {
  const p = await computePool(month, currency);
  const last = await db.ledgerEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { hash: true } });

  const period = await db.poolPeriod.upsert({
    where: { month_currency: { month, currency } },
    create: {
      month, currency,
      commissionCents: p.commissionCents, costFixedCents: p.costFixedCents,
      costUsageCents: p.costUsageCents, poolCents: p.poolCents,
      baseFraction: DEFAULT_BASE_FRACTION, meritFraction: DEFAULT_MERIT_FRACTION,
      minValidConsults: DEFAULT_MIN_VALID_CONSULTS, minRating: DEFAULT_MIN_RATING,
      status: "LOCKED", lockedAt: new Date(), ledgerHashAtLock: last?.hash ?? null,
    },
    update: {
      commissionCents: p.commissionCents, costFixedCents: p.costFixedCents,
      costUsageCents: p.costUsageCents, poolCents: p.poolCents,
      status: "LOCKED", lockedAt: new Date(), ledgerHashAtLock: last?.hash ?? null,
    },
    select: { id: true },
  });

  // Liga os LedgerEntry do mês a este período (para a tela do livro aberto)
  await db.ledgerEntry.updateMany({
    where: { competenceMonth: month, currency, poolPeriodId: null },
    data: { poolPeriodId: period.id },
  });

  for (const o of p.outputs) {
    const reason = o.qualified ? null : (p.eligByPro.get(o.professionalId)?.reason ?? null);
    const data = {
      validConsults: o.validConsults, ratingUsed: o.ratingUsed, qualityMult: o.qualityMult,
      score: o.score, qualified: o.qualified, disqualReason: reason,
      baseCents: o.baseCents, meritCents: o.meritCents, totalCents: o.totalCents,
    };
    await db.poolContribution.upsert({
      where: { poolPeriodId_professionalId: { poolPeriodId: period.id, professionalId: o.professionalId } },
      create: { poolPeriodId: period.id, professionalId: o.professionalId, ...data },
      update: data,
    });
  }

  return {
    poolPeriodId: period.id, month, currency,
    poolCents: p.poolCents, professionals: p.outputs.length,
    distributedCents: p.outputs.reduce((s, o) => s + o.totalCents, 0),
  };
}

// ── Handlers HTTP ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, month, currency } = params(req);
  try {
    if (action === "preview") return NextResponse.json(await doPreview(month, currency));
    return NextResponse.json({ error: "Ação GET inválida. Use ?action=preview" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, month, currency } = params(req);
  try {
    switch (action) {
      case "validate": return NextResponse.json(await doValidate(month, currency));
      case "ledger":   return NextResponse.json(await doLedger(month, currency));
      case "cost":     return NextResponse.json(await doCost(req, month, currency));
      case "close":    return NextResponse.json(await doClose(month, currency));
      case "run": {
        const v = await doValidate(month, currency);
        const l = await doLedger(month, currency);
        const c = await doClose(month, currency);
        return NextResponse.json({ validate: v, ledger: l, close: c });
      }
      default:
        return NextResponse.json({ error: "Ação inválida. Use validate|ledger|cost|close|run" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
