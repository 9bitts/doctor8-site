import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";

const bodySchema = z.object({
  patientUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const chartId = await ensurePatientRecord(ctx.professional.id, parsed.data.patientUserId);
  if (!chartId) {
    return NextResponse.json({ error: "Could not create chart" }, { status: 404 });
  }

  return NextResponse.json({ chartId });
}
