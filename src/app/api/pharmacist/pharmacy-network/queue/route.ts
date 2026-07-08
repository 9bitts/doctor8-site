import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPharmacistSpecialty } from "@/lib/profession-label";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "PROFESSIONAL" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (!profile || !isPharmacistSpecialty(profile.specialty)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const tokens = await db.pharmacyPrescriptionToken.findMany({
    where: {
      status: "ACTIVE",
      pharmacyOrder: { status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY"] } },
    },
    include: {
      prescription: {
        select: {
          id: true,
          createdAt: true,
          signatureStatus: true,
          medications: true,
          document: {
            select: {
              patient: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      pharmacyOrder: {
        select: {
          id: true,
          status: true,
          fulfillmentType: true,
          totalCents: true,
          createdAt: true,
          pharmacyStore: { select: { nomeFantasia: true, addressCity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    queue: tokens.map((t) => ({
      token: t.token,
      tokenStatus: t.status,
      prescriptionId: t.prescriptionId,
      patientName: t.prescription.document?.patient
        ? `${t.prescription.document.patient.firstName} ${t.prescription.document.patient.lastName}`.trim()
        : "—",
      order: t.pharmacyOrder,
      validateUrl: `/farmacias/validar/${t.token}`,
    })),
  });
}
