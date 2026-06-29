import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const [suppliers, orders] = await Promise.all([
    db.organizationSupplier.findMany({
      where: { organizationId: ctx.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    db.organizationPurchaseOrder.findMany({
      where: { organizationId: ctx.organizationId },
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    suppliers: suppliers.map((s) => ({
      id: s.id, name: s.name, cnpj: s.cnpj, email: s.email, category: s.category,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      supplierName: o.supplier.name,
      description: o.description,
      amountCents: o.amountCents,
      status: o.status,
      orderedAt: o.orderedAt?.toISOString() ?? null,
      receivedAt: o.receivedAt?.toISOString() ?? null,
    })),
  });
}

const supplierSchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "FINANCE"]);
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  if (body.type === "order") {
    const parsed = z.object({
      supplierId: z.string(),
      description: z.string().min(2),
      amountCents: z.number().int().positive(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const count = await db.organizationPurchaseOrder.count({ where: { organizationId: ctx.organizationId } });
    const order = await db.organizationPurchaseOrder.create({
      data: {
        organizationId: ctx.organizationId,
        supplierId: parsed.data.supplierId,
        orderNumber: `PO${String(count + 1).padStart(5, "0")}`,
        description: parsed.data.description,
        amountCents: parsed.data.amountCents,
      },
    });
    return NextResponse.json({ id: order.id, orderNumber: order.orderNumber }, { status: 201 });
  }

  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const supplier = await db.organizationSupplier.create({
    data: { organizationId: ctx.organizationId, ...parsed.data },
  });
  return NextResponse.json({ id: supplier.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "FINANCE"]);
  if (isApiError(ctx)) return ctx.error;

  const { id, status } = await req.json() as { id: string; status: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: { status: "SENT" | "RECEIVED"; orderedAt?: Date; receivedAt?: Date } = {
    status: status as "SENT" | "RECEIVED",
  };
  if (status === "SENT") data.orderedAt = new Date();
  if (status === "RECEIVED") data.receivedAt = new Date();

  await db.organizationPurchaseOrder.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data,
  });

  return NextResponse.json({ success: true });
}
