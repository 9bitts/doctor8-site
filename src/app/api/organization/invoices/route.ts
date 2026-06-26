import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, canViewFinance } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const invoices = await db.organizationInvoice.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      recipientName: i.recipientName,
      recipientDoc: i.recipientDoc,
      description: i.description,
      amountCents: i.amountCents,
      status: i.status,
      issuedAt: i.issuedAt?.toISOString() ?? null,
      externalProvider: i.externalProvider,
    })),
    canManage: canViewFinance(ctx.memberRole),
  });
}

const createSchema = z.object({
  recipientName: z.string().min(2),
  recipientDoc: z.string().optional(),
  description: z.string().min(2),
  amountCents: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const invoice = await db.organizationInvoice.create({
    data: {
      organizationId: ctx.organizationId,
      recipientName: parsed.data.recipientName,
      recipientDoc: parsed.data.recipientDoc,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
    },
  });

  return NextResponse.json({ id: invoice.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const { id, status, number } = await req.json() as { id: string; status?: string; number?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.organizationInvoice.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      status: status as "ISSUED" | undefined,
      number,
      issuedAt: status === "ISSUED" ? new Date() : undefined,
      externalProvider: status === "ISSUED" ? "manual" : undefined,
    },
  });

  return NextResponse.json({ success: true });
}
