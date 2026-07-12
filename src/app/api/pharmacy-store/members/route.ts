import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requirePharmacyStore(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const members = await db.pharmacyStoreMember.findMany({
    where: { pharmacyStoreId: ctx.pharmacyStoreId },
    include: {
      user: { select: { id: true, email: true, lastLoginAt: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    })),
    canManage: ctx.memberRole === "OWNER" || ctx.memberRole === "ADMIN",
  });
}

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePharmacyStore(["OWNER", "ADMIN"], { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado. Peça para criar conta em doctor8.org/farmacias/cadastro." },
      { status: 404 },
    );
  }
  if (user.role !== "PHARMACY_STORE") {
    return NextResponse.json(
      { error: "Este e-mail não pertence a uma conta de farmácia Doctor8." },
      { status: 400 },
    );
  }

  const existing = await db.pharmacyStoreMember.findUnique({
    where: {
      pharmacyStoreId_userId: {
        pharmacyStoreId: ctx.pharmacyStoreId,
        userId: user.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Usuário já faz parte desta farmácia." }, { status: 409 });
  }

  const otherStore = await db.pharmacyStoreMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (otherStore) {
    return NextResponse.json(
      { error: "Este usuário já está vinculado a outra farmácia." },
      { status: 409 },
    );
  }

  const member = await db.pharmacyStoreMember.create({
    data: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      userId: user.id,
      role: parsed.data.role,
      status: "ACTIVE",
    },
  });

  return NextResponse.json(
    { member: { id: member.id, userId: user.id, email, role: member.role } },
    { status: 201 },
  );
}
