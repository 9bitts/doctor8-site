import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildPgrInventoryExport } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const documents = await db.employerNr1Document.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { exportedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ documents });
}

export async function POST() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const payload = await buildPgrInventoryExport(ctx.employerCompanyId);
  if (!payload) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ export: payload });
}
