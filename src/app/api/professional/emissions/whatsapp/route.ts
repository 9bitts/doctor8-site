// POST ? send or resend WhatsApp notification for a signed emission.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendEmissionWhatsApp } from "@/lib/emission-whatsapp";
import type { EmissionDeliverKind } from "@/lib/emission-deliver";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["prescription", "exam", "document"]),
  id: z.string().min(1),
  message: z.string().max(1000).optional(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { kind, id, message, force } = parsed.data;
  const deliverKind: EmissionDeliverKind =
    kind === "exam" ? "exam" : kind === "document" ? "document" : "prescription";

  if (deliverKind === "prescription") {
    const rx = await db.prescription.findUnique({
      where: { id },
      select: { professionalId: true, signatureStatus: true },
    });
    if (!rx || rx.professionalId !== ctx.professional.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const doc = await db.medicalDocument.findUnique({
      where: { id },
      select: { professionalId: true, signatureStatus: true },
    });
    if (!doc || doc.professionalId !== ctx.professional.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const doctorName = `${professional.firstName} ${professional.lastName}`.trim();
  const result = await sendEmissionWhatsApp({
    kind: deliverKind,
    prescriptionId: deliverKind === "prescription" ? id : undefined,
    documentId: deliverKind !== "prescription" ? id : undefined,
    doctorName,
    force: !!force,
    customMessage: message,
  });

  return NextResponse.json({
    status: result.status,
    error: result.error,
    waMeUrl: result.waMeUrl,
  });
}
