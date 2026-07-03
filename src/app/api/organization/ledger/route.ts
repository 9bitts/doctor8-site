import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { canViewFinance } from "@/lib/organization-auth";

import { db } from "@/lib/db";
import { z } from "zod";
import { dateOnlyRangeInTz } from "@/lib/timezone";

/** Brazilian organizations — report/filter boundaries use America/Sao_Paulo. */
const ORG_REPORT_TZ = "America/Sao_Paulo";

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const entries = await db.organizationLedgerEntry.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(status ? { status: status as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" } : {}),
      ...(type ? { type: type as "INCOME" | "EXPENSE" } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const now = new Date();
  const summary = {
    incomePending: 0,
    incomePaid: 0,
    expensePending: 0,
    expensePaid: 0,
    overdueCount: 0,
  };

  for (const e of entries) {
    const isOverdue = e.status === "PENDING" && e.dueDate && e.dueDate < now;
    if (isOverdue) summary.overdueCount++;
    if (e.type === "INCOME") {
      if (e.status === "PAID") summary.incomePaid += e.amountCents;
      else if (e.status === "PENDING") summary.incomePending += e.amountCents;
    } else {
      if (e.status === "PAID") summary.expensePaid += e.amountCents;
      else if (e.status === "PENDING") summary.expensePending += e.amountCents;
    }
  }

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      description: e.description,
      category: e.category,
      amountCents: e.amountCents,
      currency: e.currency,
      dueDate: e.dueDate?.toISOString() ?? null,
      paidAt: e.paidAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      isOverdue: e.status === "PENDING" && e.dueDate ? e.dueDate < now : false,
    })),
    summary,
    currency: ctx.organization.currency,
    canManage: canViewFinance(ctx.memberRole),
  });
}

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(2).max(200),
  category: z.string().max(60).optional(),
  amountCents: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "FINANCE", "ACCOUNTANT"]);
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const entry = await db.organizationLedgerEntry.create({
    data: {
      organizationId: ctx.organizationId,
      type: parsed.data.type,
      description: parsed.data.description,
      category: parsed.data.category,
      amountCents: parsed.data.amountCents,
      currency: ctx.organization.currency,
      dueDate: parsed.data.dueDate
        ? dateOnlyRangeInTz(parsed.data.dueDate, ORG_REPORT_TZ).start
        : null,
      createdById: ctx.userId,
    },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  description: z.string().min(2).max(200).optional(),
  amountCents: z.number().int().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "FINANCE", "ACCOUNTANT"]);
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await db.organizationLedgerEntry.findFirst({
    where: { id: parsed.data.id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paidAt =
    parsed.data.status === "PAID" && existing.status !== "PAID"
      ? new Date()
      : parsed.data.status && parsed.data.status !== "PAID"
        ? null
        : existing.paidAt;

  await db.organizationLedgerEntry.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      dueDate: parsed.data.dueDate === null
        ? null
        : parsed.data.dueDate
          ? dateOnlyRangeInTz(parsed.data.dueDate, ORG_REPORT_TZ).start
          : undefined,
      paidAt,
    },
  });

  return NextResponse.json({ success: true });
}
