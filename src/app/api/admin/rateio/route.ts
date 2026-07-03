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
import { Prisma } from "@prisma/client";
import {
  commissionCentsOf, isOutsideRefundWindow, monthBounds, poolCentsOf,
  isEligible, splitPool, ledgerHash, SHORT_CALL_SECONDS,
  DEFAULT_BASE_FRACTION, DEFAULT_MERIT_FRACTION,
  DEFAULT_MIN_VALID_CONSULTS, DEFAULT_MIN_RATING,
  type ContributionInput,
  type ContributionOutput,
} from "@/lib/rateio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthContext =
  | { ok: true; isAdminSession: true; adminUserId: string }
  | { ok: true; isAdminSession: false; adminUserId: null }
  | { ok: false; isAdminSession: false; adminUserId: null };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLedgerDedupError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P2002" || e.code === "P2034")
  );
}

function logRateioDedup(context: string, detail: unknown): void {
  console.log(`[RATEIO-DEDUP] ${context}`, detail);
}

// ── Autorização ───────────────────────────────────────────────────────────────
async function authorize(req: NextRequest): Promise<boolean> {
  return (await authorizeContext(req)).ok;
}

async function authorizeContext(req: NextRequest): Promise<AuthContext> {
  const secret = req.headers.get("x-cron-secret");
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
    return { ok: true, isAdminSession: false, adminUserId: null };
  }
  const session = await auth();
  if (session?.user?.role === "ADMIN" && session.user.id) {
    return { ok: true, isAdminSession: true, adminUserId: session.user.id };
  }
  return { ok: false, isAdminSession: false, adminUserId: null };
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

type RateioProviderType = "HEALTH" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

type ProviderRefFields = {
  providerType: string;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
};

function assertExactlyOneProviderId(refs: ProviderRefFields, context: string): void {
  const present = [
    refs.professionalId || null,
    refs.psychoanalystId || null,
    refs.integrativeTherapistId || null,
  ].filter((id): id is string => !!id);
  if (present.length !== 1) {
    console.error("[RATEIO-INVALID-PROVIDER]", context, refs);
    throw new Error("Rateio provider invariant violated");
  }
}

function providerRefFromAppointment(a: {
  providerType: RateioProviderType;
  professionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
}): ProviderRefFields {
  return {
    providerType: a.providerType,
    professionalId: a.providerType === "HEALTH" ? a.professionalId : null,
    psychoanalystId: a.providerType === "PSYCHOANALYST" ? a.psychoanalystId : null,
    integrativeTherapistId: a.providerType === "INTEGRATIVE_THERAPIST" ? a.integrativeTherapistId : null,
  };
}

function providerRefFromHealthProfessional(professionalId: string): ProviderRefFields {
  return {
    providerType: "HEALTH",
    professionalId,
    psychoanalystId: null,
    integrativeTherapistId: null,
  };
}

function validationProviderFields(refs: ProviderRefFields, context: string) {
  assertExactlyOneProviderId(refs, context);
  return {
    providerType: refs.providerType,
    professionalId: refs.professionalId ?? null,
    psychoanalystId: refs.psychoanalystId ?? null,
    integrativeTherapistId: refs.integrativeTherapistId ?? null,
  };
}

function providerKey(refs: ProviderRefFields): string {
  const id = refs.professionalId ?? refs.psychoanalystId ?? refs.integrativeTherapistId ?? "";
  return `${refs.providerType}:${id}`;
}

type ExtendedContributionInput = ContributionInput & {
  providerType: string;
  providerProfessionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
};

type ExtendedContributionOutput = ContributionOutput & {
  providerType: string;
  providerProfessionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
};

async function avgRatingForProvider(refs: ProviderRefFields): Promise<number | null> {
  if (refs.providerType === "PSYCHOANALYST" && refs.psychoanalystId) {
    const agg = await db.psychoanalystReview.aggregate({
      _avg: { rating: true },
      where: { psychoanalystId: refs.psychoanalystId },
    });
    return agg._avg.rating ?? null;
  }
  if (refs.providerType === "HEALTH" && refs.professionalId) {
    const agg = await db.professionalReview.aggregate({
      _avg: { rating: true },
      where: { professionalId: refs.professionalId },
    });
    return agg._avg.rating ?? null;
  }
  return null;
}

function poolContributionUpsertWhere(
  poolPeriodId: string,
  refs: ProviderRefFields,
): Prisma.PoolContributionWhereUniqueInput {
  assertExactlyOneProviderId(refs, "poolContributionUpsertWhere");
  if (refs.providerType === "PSYCHOANALYST") {
    return {
      poolPeriodId_psychoanalystId: {
        poolPeriodId,
        psychoanalystId: refs.psychoanalystId as string,
      },
    };
  }
  if (refs.providerType === "INTEGRATIVE_THERAPIST") {
    return {
      poolPeriodId_integrativeTherapistId: {
        poolPeriodId,
        integrativeTherapistId: refs.integrativeTherapistId as string,
      },
    };
  }
  return {
    poolPeriodId_professionalId: {
      poolPeriodId,
      professionalId: refs.professionalId as string,
    },
  };
}

function poolContributionCreateFields(poolPeriodId: string, refs: ProviderRefFields) {
  assertExactlyOneProviderId(refs, "poolContributionCreateFields");
  return {
    poolPeriodId,
    providerType: refs.providerType,
    professionalId: refs.professionalId ?? null,
    psychoanalystId: refs.psychoanalystId ?? null,
    integrativeTherapistId: refs.integrativeTherapistId ?? null,
  };
}

// ── Coleta de consultas candidatas do mês/moeda ───────────────────────────────
interface Candidate {
  kind: "appt" | "jit";
  refId: string;            // appointmentId ou jitQueueId
  providerType: RateioProviderType;
  professionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
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

  // 1) Consultas agendadas pagas e concluídas (todos os providerType)
  const appts = await db.appointment.findMany({
    where: {
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency,
      OR: [
        { professionalId: { not: null } },
        { psychoanalystId: { not: null } },
        { integrativeTherapistId: { not: null } },
      ],
    },
    select: {
      id: true, priceAmount: true, currency: true, paidAt: true,
      providerType: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
      professional: { select: { userId: true } },
      psychoanalyst: { select: { userId: true } },
      integrativeTherapist: { select: { userId: true } },
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
    const refs = providerRefFromAppointment(a);
    assertExactlyOneProviderId(refs, `collectCandidates appt=${a.id}`);
    const professionalUserId =
      a.providerType === "PSYCHOANALYST"
        ? a.psychoanalyst?.userId ?? null
        : a.providerType === "INTEGRATIVE_THERAPIST"
          ? a.integrativeTherapist?.userId ?? null
          : a.professional?.userId ?? null;
    out.push({
      kind: "appt",
      refId: a.id,
      providerType: a.providerType,
      professionalId: refs.professionalId ?? null,
      psychoanalystId: refs.psychoanalystId ?? null,
      integrativeTherapistId: refs.integrativeTherapistId ?? null,
      professionalUserId,
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
    const jitRefs = providerRefFromHealthProfessional(q.session.professionalId);
    out.push({
      kind: "jit",
      refId: q.id,
      providerType: "HEALTH",
      professionalId: jitRefs.professionalId ?? null,
      psychoanalystId: null,
      integrativeTherapistId: null,
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
    const providerFields = validationProviderFields(
      {
        providerType: c.providerType,
        professionalId: c.professionalId,
        psychoanalystId: c.psychoanalystId,
        integrativeTherapistId: c.integrativeTherapistId,
      },
      `doValidate ${c.kind}=${c.refId}`,
    );
    const data = {
      ...providerFields,
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
    const refKey = v.appointmentId
      ? `appt:${v.appointmentId}`
      : `jit:${v.jitQueueId}`;

    try {
      const created = await db.$transaction(
        async (tx) => {
          const existing = await tx.ledgerEntry.findFirst({
            where: {
              type: "COMMISSION_IN",
              ...(v.appointmentId
                ? { appointmentId: v.appointmentId }
                : { jitQueueId: v.jitQueueId }),
            },
            select: { id: true },
          });
          if (existing) return false;

          const last = await tx.ledgerEntry.findFirst({
            orderBy: { createdAt: "desc" },
            select: { hash: true },
          });
          const occurredAt = v.createdAt ?? new Date();
          const sourceRef = `commission:${v.appointmentId ? "appt" : "jit"}:${v.appointmentId ?? v.jitQueueId}`;
          const hash = ledgerHash(last?.hash ?? null, {
            type: "COMMISSION_IN",
            category: null,
            amountCents: v.commissionCents,
            currency,
            competenceMonth: month,
            source: "SYSTEM",
            sourceRef,
            appointmentId: v.appointmentId ?? null,
            jitQueueId: v.jitQueueId ?? null,
            occurredAt: occurredAt.toISOString(),
          });

          await tx.ledgerEntry.create({
            data: {
              type: "COMMISSION_IN",
              category: null,
              amountCents: v.commissionCents,
              currency,
              competenceMonth: month,
              source: "SYSTEM",
              sourceRef,
              appointmentId: v.appointmentId ?? undefined,
              jitQueueId: v.jitQueueId ?? undefined,
              prevHash: last?.hash ?? null,
              hash,
              occurredAt,
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (created) written++;
    } catch (e) {
      if (isLedgerDedupError(e)) {
        logRateioDedup(`doLedger skipped ${refKey}`, e);
        continue;
      }
      throw e;
    }
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

  const backoffs = [100, 200, 400];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = await db.$transaction(
        async (tx) => {
          const last = await tx.ledgerEntry.findFirst({
            orderBy: { createdAt: "desc" },
            select: { hash: true },
          });
          const hash = ledgerHash(last?.hash ?? null, {
            type,
            category,
            amountCents,
            currency,
            competenceMonth: month,
            source,
            sourceRef: body.sourceRef ?? null,
            appointmentId: null,
            jitQueueId: null,
            occurredAt: occurredAt.toISOString(),
          });

          return tx.ledgerEntry.create({
            data: {
              type,
              category: category as never,
              amountCents,
              currency,
              competenceMonth: month,
              source: source as never,
              sourceRef: body.sourceRef ?? null,
              invoiceUrl: body.invoiceUrl ?? null,
              prevHash: last?.hash ?? null,
              hash,
              occurredAt,
            },
            select: { id: true, hash: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { ok: true, entry };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        attempt < 2
      ) {
        await sleep(backoffs[attempt] ?? 400);
        continue;
      }
      if (isLedgerDedupError(e)) {
        logRateioDedup("doCost skipped (dedup/serialization)", e);
        return { ok: false, deduped: true };
      }
      throw e;
    }
  }

  return { error: "Falha ao gravar custo após retries de serialização" };
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

  // Profissionais com consultas válidas no mês/moeda (agrupados por provider unificado)
  const valids = await db.consultationValidation.findMany({
    where: { competenceMonth: month, currency, isValid: true },
    select: {
      providerType: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
    },
  });

  const grouped = new Map<string, { refs: ProviderRefFields; count: number }>();
  for (const v of valids) {
    const refs: ProviderRefFields = {
      providerType: v.providerType,
      professionalId: v.professionalId,
      psychoanalystId: v.psychoanalystId,
      integrativeTherapistId: v.integrativeTherapistId,
    };
    assertExactlyOneProviderId(refs, "computePool groupBy");
    const key = providerKey(refs);
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { refs, count: 1 });
  }

  const inputs: ExtendedContributionInput[] = [];
  for (const { refs, count } of grouped.values()) {
    const avgRating = await avgRatingForProvider(refs);
    const validConsults = count;
    const elig = isEligible(validConsults, avgRating);
    const profileId = refs.professionalId ?? refs.psychoanalystId ?? refs.integrativeTherapistId ?? "";
    inputs.push({
      providerType: refs.providerType,
      providerProfessionalId: refs.professionalId ?? null,
      psychoanalystId: refs.psychoanalystId ?? null,
      integrativeTherapistId: refs.integrativeTherapistId ?? null,
      professionalId: profileId,
      validConsults,
      avgRating,
      qualified: elig.qualified,
    });
  }

  const outputs = splitPool(poolCents, inputs);
  const extendedOutputs: ExtendedContributionOutput[] = outputs.map((o, idx) => ({
    ...o,
    providerType: inputs[idx].providerType,
    providerProfessionalId: inputs[idx].providerProfessionalId,
    psychoanalystId: inputs[idx].psychoanalystId,
    integrativeTherapistId: inputs[idx].integrativeTherapistId,
  }));
  const eligByPro = new Map(
    inputs.map((i) => [
      providerKey({
        providerType: i.providerType,
        professionalId: i.providerProfessionalId,
        psychoanalystId: i.psychoanalystId,
        integrativeTherapistId: i.integrativeTherapistId,
      }),
      isEligible(i.validConsults, i.avgRating),
    ]),
  );

  return {
    commissionCents,
    costFixedCents,
    costUsageCents,
    poolCents,
    outputs: extendedOutputs,
    eligByPro,
  };
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
      ...o,
      disqualReason: o.qualified
        ? null
        : (p.eligByPro.get(
            providerKey({
              providerType: o.providerType,
              professionalId: o.providerProfessionalId,
              psychoanalystId: o.psychoanalystId,
              integrativeTherapistId: o.integrativeTherapistId,
            }),
          )?.reason ?? null),
    })),
  };
}

// ── AÇÃO: close (grava PoolPeriod + PoolContribution, status LOCKED) ──────────
type CloseOptions = {
  force?: boolean;
  adminUserId?: string | null;
};

type CloseResult =
  | {
      poolPeriodId: string;
      month: string;
      currency: string;
      poolCents: number;
      professionals: number;
      distributedCents: number;
    }
  | {
      conflict: true;
      error: "PERIOD_ALREADY_CLOSED";
      status: string;
      lockedAt: string | null;
    };

async function doClose(
  month: string,
  currency: string,
  opts: CloseOptions = {},
): Promise<CloseResult> {
  const existing = await db.poolPeriod.findUnique({
    where: { month_currency: { month, currency } },
  });

  if (existing && existing.status !== "OPEN") {
    if (!opts.force) {
      return {
        conflict: true,
        error: "PERIOD_ALREADY_CLOSED",
        status: existing.status,
        lockedAt: existing.lockedAt ? existing.lockedAt.toISOString() : null,
      };
    }
  }

  const p = await computePool(month, currency);
  const last = await db.ledgerEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { hash: true } });

  if (existing && existing.status !== "OPEN" && opts.force && opts.adminUserId) {
    console.log("[RATEIO-FORCE-RECLOSE]", {
      adminId: opts.adminUserId,
      month,
      currency,
      old: {
        status: existing.status,
        commissionCents: existing.commissionCents,
        costFixedCents: existing.costFixedCents,
        costUsageCents: existing.costUsageCents,
        poolCents: existing.poolCents,
        lockedAt: existing.lockedAt?.toISOString() ?? null,
      },
      new: {
        commissionCents: p.commissionCents,
        costFixedCents: p.costFixedCents,
        costUsageCents: p.costUsageCents,
        poolCents: p.poolCents,
      },
    });
  }

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
    const refs: ProviderRefFields = {
      providerType: o.providerType,
      professionalId: o.providerProfessionalId,
      psychoanalystId: o.psychoanalystId,
      integrativeTherapistId: o.integrativeTherapistId,
    };
    const reason = o.qualified ? null : (p.eligByPro.get(providerKey(refs))?.reason ?? null);
    const data = {
      validConsults: o.validConsults, ratingUsed: o.ratingUsed, qualityMult: o.qualityMult,
      score: o.score, qualified: o.qualified, disqualReason: reason,
      baseCents: o.baseCents, meritCents: o.meritCents, totalCents: o.totalCents,
    };
    await db.poolContribution.upsert({
      where: poolContributionUpsertWhere(period.id, refs),
      create: { ...poolContributionCreateFields(period.id, refs), ...data },
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
  const authCtx = await authorizeContext(req);
  if (!authCtx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, month, currency } = params(req);
  try {
    switch (action) {
      case "validate":
        return NextResponse.json(await doValidate(month, currency));
      case "ledger":
        return NextResponse.json(await doLedger(month, currency));
      case "cost":
        return NextResponse.json(await doCost(req, month, currency));
      case "close": {
        const body = await req.json().catch(() => ({}));
        const force = body.force === true;
        if (force && !authCtx.isAdminSession) {
          return NextResponse.json(
            { error: "FORCE_REQUIRES_ADMIN_SESSION" },
            { status: 403 },
          );
        }
        const result = await doClose(month, currency, {
          force,
          adminUserId: authCtx.isAdminSession ? authCtx.adminUserId : null,
        });
        if ("conflict" in result && result.conflict) {
          return NextResponse.json(
            {
              error: result.error,
              status: result.status,
              lockedAt: result.lockedAt,
            },
            { status: 409 },
          );
        }
        return NextResponse.json(result);
      }
      case "run": {
        const v = await doValidate(month, currency);
        const l = await doLedger(month, currency);
        const period = await db.poolPeriod.findUnique({
          where: { month_currency: { month, currency } },
          select: { status: true },
        });
        let c:
          | Awaited<ReturnType<typeof doClose>>
          | { skipped: true; reason: string; status: string };
        if (period && period.status !== "OPEN") {
          console.log(
            `[RATEIO-RUN] Skipping close for ${month}/${currency}: period status=${period.status}`,
          );
          c = { skipped: true, reason: "PERIOD_NOT_OPEN", status: period.status };
        } else {
          c = await doClose(month, currency);
        }
        return NextResponse.json({ validate: v, ledger: l, close: c });
      }
      default:
        return NextResponse.json({ error: "Ação inválida. Use validate|ledger|cost|close|run" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
