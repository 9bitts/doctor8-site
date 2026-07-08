import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const tx = await db.employerEsocialTransmission.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!tx?.payloadXml) {
    return NextResponse.json({ error: "XML not found" }, { status: 404 });
  }

  return new NextResponse(tx.payloadXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tx.eventType}-${id.slice(0, 8)}.xml"`,
    },
  });
}
