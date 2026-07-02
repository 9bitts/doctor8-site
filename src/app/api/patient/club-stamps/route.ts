// GET - Club Doctor stamp card balance for the logged-in patient.

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { getStampBalance, STAMPS_FOR_FREE_MONTH } from "@/lib/club-stamps";
import { KIND_LABELS } from "@/lib/provider-kind";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const data = await getStampBalance(ctx.userId);
  return NextResponse.json({
    stampsForFreeMonth: STAMPS_FOR_FREE_MONTH,
    kindLabels: KIND_LABELS,
    ...data,
    kindsInWindowLabels: data.kindsInWindow.map((k) => KIND_LABELS[k]),
  });
}
