import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildPgrInventoryExport } from "@/lib/employer-nr1";
import { buildPgrInventoryPdf } from "@/lib/employer-pgr-pdf";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const payload = await buildPgrInventoryExport(ctx.employerCompanyId);
  if (!payload) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const pdfBytes = await buildPgrInventoryPdf(payload);
  const filename = `pgr-inventario-nr1-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
