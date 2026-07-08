import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildKey, uploadToS3 } from "@/lib/s3";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const exam = await db.employerOccupationalExam.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF only" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildKey(`employer/${ctx.employerCompanyId}/exam-reports`, file.name);
  await uploadToS3({ key, body: buffer, contentType: "application/pdf" });

  const updated = await db.employerOccupationalExam.update({
    where: { id },
    data: { reportPdfKey: key },
  });

  return NextResponse.json({ exam: { id: updated.id, reportPdfKey: updated.reportPdfKey } });
}
