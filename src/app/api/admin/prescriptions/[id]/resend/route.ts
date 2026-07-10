import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { deliverEmissionToPatient } from "@/lib/emission-deliver";
import { scheduleEmissionDelivery } from "@/lib/qstash-emission";

/** Admin — re-send prescription notification to patient. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const prescription = await db.prescription.findUnique({
    where: { id: params.id },
    include: { professional: { select: { userId: true } } },
  });

  if (!prescription?.professional) {
    return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
  }

  // Clear prior delivery flag to allow re-send
  await db.prescription.update({
    where: { id: prescription.id },
    data: { patientNotifiedAt: null },
  });

  const queued = await scheduleEmissionDelivery({
    professionalUserId: prescription.professional.userId,
    kind: "prescription",
    id: prescription.id,
    sendWhatsApp: true,
  });

  if (queued) {
    return NextResponse.json({ ok: true, mode: "queued" });
  }

  const result = await deliverEmissionToPatient(
    prescription.professional.userId,
    "prescription",
    prescription.id,
    { sendWhatsApp: true, forceWhatsapp: true },
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, mode: "sync", result });
}
