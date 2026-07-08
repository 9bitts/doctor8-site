import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { generateMonthlyEapSnapshot, listEapSnapshots } from "@/lib/employer-eap-billing";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const snapshots = await listEapSnapshots(ctx.employerCompanyId);
  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      id: s.id,
      yearMonth: s.yearMonth,
      sessionsCompleted: s.sessionsCompleted,
      amountCents: s.amountCents,
      repasseCents: s.repasseCents,
      generatedAt: s.generatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const yearMonth = typeof body?.yearMonth === "string" ? body.yearMonth : undefined;

  const snapshot = await generateMonthlyEapSnapshot(ctx.employerCompanyId, yearMonth);

  return NextResponse.json({
    snapshot: {
      yearMonth: snapshot.yearMonth,
      sessionsCompleted: snapshot.sessionsCompleted,
      amountCents: snapshot.amountCents,
      repasseCents: snapshot.repasseCents,
      generatedAt: snapshot.generatedAt.toISOString(),
    },
  });
}
