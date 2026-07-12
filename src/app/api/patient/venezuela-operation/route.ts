import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isVenezuelaOperationActiveForUser } from "@/lib/humanitarian/notify";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { region: true },
  });

  const active = await isVenezuelaOperationActiveForUser(user?.region ?? null);

  return NextResponse.json({ active });
}
