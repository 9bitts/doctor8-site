import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { requireEmployerApi } from "@/lib/api-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const signature = await db.employerDocumentSignature.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId, signatureStatus: "SIGNED" },
  });
  if (!signature?.signedPdfKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedReadUrl(signature.signedPdfKey, 600);
  return NextResponse.redirect(url);
}
