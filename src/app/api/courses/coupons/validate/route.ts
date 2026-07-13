import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateCoupon } from "@/lib/courses/coupons";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code") ?? "";
  const courseId = req.nextUrl.searchParams.get("courseId") ?? "";
  if (!code.trim() || !courseId) {
    return NextResponse.json({ error: "Informe código e curso." }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { priceCents: true, status: true },
  });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Curso não disponível" }, { status: 404 });
  }
  if (course.priceCents === 0) {
    return NextResponse.json({ error: "Este curso já é gratuito." }, { status: 400 });
  }

  const result = await validateCoupon(code, courseId, session.user.id, course.priceCents);
  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      message: result.reason ?? "Cupom inválido.",
    });
  }

  return NextResponse.json({
    valid: true,
    amountOffCents: result.amountOffCents,
    finalCents: result.finalCents,
    freeWithCoupon: result.finalCents === 0,
    originalCents: course.priceCents,
  });
}
