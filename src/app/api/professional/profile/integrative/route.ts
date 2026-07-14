import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  practicesIntegrativeMedicine: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.professionalProfile.update({
    where: { id: ctx.professional.id },
    data: { practicesIntegrativeMedicine: parsed.data.practicesIntegrativeMedicine },
    select: { practicesIntegrativeMedicine: true },
  });

  return NextResponse.json({ profile });
}
