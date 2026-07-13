import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  getStripeConnectStatusForUser,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";
import { shouldBlockCoursePublishForConnect } from "@/lib/courses/checkout-payment";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED"]),
  rejectedReason: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "PUBLISHED" && isStripeConnectEnabled()) {
    const existing = await db.course.findUnique({
      where: { id: params.id },
      select: { instructorUserId: true, priceCents: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }
    const { status: connectStatus } = await getStripeConnectStatusForUser(existing.instructorUserId);
    if (shouldBlockCoursePublishForConnect(true, existing.priceCents, connectStatus)) {
      return NextResponse.json(
        {
          error: "CONNECT_REQUIRED",
          message:
            "O instrutor precisa concluir o cadastro de recebimentos (Stripe Connect) antes de publicar.",
        },
        { status: 400 },
      );
    }
  }

  const course = await db.course.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      rejectedReason: parsed.data.status === "REJECTED" ? parsed.data.rejectedReason ?? null : null,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ course });
}
