import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupPrescriptionByToken } from "@/lib/pharmacy-network/prescription-token";
import { decrypt } from "@/lib/encryption";
import { isPharmacistSpecialty } from "@/lib/profession-label";
import { authorizePharmacyPrescriptionValidate } from "@/lib/pharmacy-prescription-validate-auth";
import type { Prisma } from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
  }

  const row = await lookupPrescriptionByToken(token);
  if (!row) {
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });
  }

  const pharmacyStoreId = req.nextUrl.searchParams.get("pharmacyStoreId")?.trim();
  const authz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: row.pharmacyStoreId,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const rx = row.prescription;
  const patientName = rx.document?.patient
    ? `${rx.document.patient.firstName} ${rx.document.patient.lastName}`.trim()
    : "—";

  return NextResponse.json({
    token: row.token,
    status: row.status,
    dispensedAt: row.dispensedAt,
    prescription: {
      id: rx.id,
      createdAt: rx.createdAt,
      validUntil: rx.validUntil,
      signatureStatus: rx.signatureStatus,
      medications: rx.medications,
      instructions: rx.instructions ? safeDecrypt(rx.instructions) : "",
      patientName,
      doctor: rx.professional
        ? `${rx.professional.firstName} ${rx.professional.lastName}`.trim()
        : null,
    },
    order: row.pharmacyOrder
      ? { id: row.pharmacyOrder.id, status: row.pharmacyOrder.status }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token = body.token?.trim();
  const pharmacyStoreId = body.pharmacyStoreId?.trim();
  if (!token) {
    return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
  }

  const row = await lookupPrescriptionByToken(token);
  if (!row || row.status === "DISPENSED") {
    return NextResponse.json({ error: "Receita inválida ou já dispensada" }, { status: 400 });
  }

  const authz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: row.pharmacyStoreId,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const storeId = pharmacyStoreId || row.pharmacyStoreId;
  if (!storeId) {
    return NextResponse.json({ error: "pharmacyStoreId obrigatório" }, { status: 400 });
  }

  const now = new Date();

  const rxFull = await db.prescription.findUnique({
    where: { id: row.prescriptionId },
    include: {
      document: { select: { patientRecordId: true, patientId: true } },
      pharmacyOrders: {
        where: { id: row.pharmacyOrderId ?? undefined },
        include: { items: true },
      },
    },
  });

  let pharmacistProfileId: string | null = null;
  if (session.user.role === "PROFESSIONAL") {
    const pro = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, specialty: true },
    });
    if (pro && isPharmacistSpecialty(pro.specialty)) {
      pharmacistProfileId = pro.id;
    }
  }

  await db.$transaction(async (tx) => {
    await tx.pharmacyPrescriptionToken.update({
      where: { id: row.id },
      data: {
        status: "DISPENSED",
        dispensedAt: now,
        dispensedByUserId: session.user.id,
        pharmacyStoreId: storeId,
      },
    });

    await tx.prescription.update({
      where: { id: row.prescriptionId },
      data: {
        pharmacyDispensedAt: now,
        pharmacyDispensedStoreId: storeId,
      },
    });

    if (row.pharmacyOrderId) {
      await tx.pharmacyOrder.update({
        where: { id: row.pharmacyOrderId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          validatedAt: now,
          validatedByUserId: session.user.id,
        },
      });
    }

    if (pharmacistProfileId && rxFull?.document?.patientRecordId) {
      const meds = (rxFull.medications as { name: string; dosage?: string }[]) || [];
      const orderItems = rxFull.pharmacyOrders[0]?.items ?? [];
      await tx.pharmacyDispensingRecord.create({
        data: {
          patientRecordId: rxFull.document.patientRecordId,
          pharmacistId: pharmacistProfileId,
          prescriptionId: row.prescriptionId,
          prescriptionSnapshot: {
            id: row.prescriptionId,
            medications: meds,
            dispensedAt: now.toISOString(),
            pharmacyStoreId: storeId,
          } as Prisma.InputJsonValue,
          medicationsDispensed: orderItems.map((i) => ({
            drugName: i.drugName,
            presentation: i.presentation,
            quantity: i.quantity,
          })) as Prisma.InputJsonValue,
          status: "DISPENSED",
          validationNotes: "Dispensação via rede Doctor8 Farmácias",
        },
      });
    }
  });

  return NextResponse.json({ success: true, dispensedAt: now.toISOString() });
}
