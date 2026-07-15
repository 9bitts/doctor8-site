import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildSncrLoginUrl } from "@/lib/sncr/client";
import { getPublicBase } from "@/lib/sign-helpers";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const publicBase = getPublicBase(req);
  const returnUrl = `${publicBase}/api/professional/sncr/auth/callback?professionalId=${professional.id}`;
  const loginUrl = buildSncrLoginUrl(returnUrl);

  return NextResponse.redirect(loginUrl);
}
