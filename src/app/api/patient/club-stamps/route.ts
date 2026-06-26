// GET - Club Doctor stamp card balance for the logged-in patient.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStampBalance, STAMPS_FOR_FREE_MONTH } from "@/lib/club-stamps";
import { KIND_LABELS } from "@/lib/provider-kind";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getStampBalance(session.user.id);
  return NextResponse.json({
    stampsForFreeMonth: STAMPS_FOR_FREE_MONTH,
    kindLabels: KIND_LABELS,
    ...data,
    kindsInWindowLabels: data.kindsInWindow.map((k) => KIND_LABELS[k]),
  });
}
