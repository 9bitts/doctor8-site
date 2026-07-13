import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { normalizeCouponCode } from "@/lib/courses/coupons";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().min(3).max(32),
  description: z.string().max(500).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().positive(),
  courseId: z.string().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coupons = await db.courseCoupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const code = normalizeCouponCode(parsed.data.code);
  if (parsed.data.discountType === "PERCENT" && parsed.data.discountValue > 100) {
    return NextResponse.json({ error: "Desconto percentual não pode exceder 100%." }, { status: 400 });
  }

  const existing = await db.courseCoupon.findUnique({ where: { code }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um cupom com este código." }, { status: 409 });
  }

  if (parsed.data.courseId) {
    const course = await db.course.findUnique({
      where: { id: parsed.data.courseId },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
    }
  }

  const coupon = await db.courseCoupon.create({
    data: {
      code,
      description: parsed.data.description ?? null,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      courseId: parsed.data.courseId ?? null,
      maxRedemptions: parsed.data.maxRedemptions ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdBy: session.user.id,
    },
    include: { course: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
