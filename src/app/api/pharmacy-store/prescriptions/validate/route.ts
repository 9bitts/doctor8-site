import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupPrescriptionByToken } from "@/lib/pharmacy-network/prescription-token";
import { decrypt } from "@/lib/encryption";
import { isPharmacistSpecialty } from "@/lib/profession-label";
import { authorizePharmacyPrescriptionValidate } from "@/lib/pharmacy-prescription-validate-auth";
import {
  assertOrderPaidForDispense,
  assertPrescriptionDispensable,
} from "@/lib/pharmacy-network/dispense-guards";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
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

  const pharmacyStoreId = req.nextUrl.searchParams.get("pharmacyStoreId")?.trim();
  const authz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: null,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const row = await lookupPrescriptionByToken(token);
  if (!row) {
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });
  }

  const storeAuthz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: row.pharmacyStoreId,
  });
  if (!storeAuthz.ok) {
    return NextResponse.json({ error: storeAuthz.error }, { status: storeAuthz.status });
  }

  createAuditLog({
    userId: session.user.id,
    action: AuditAction.VIEW_RECORD,
    resource: "PharmacyPrescriptionToken",
    resourceId: row.id,
  }).catch(console.error);

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

  const authz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: null,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const row = await lookupPrescriptionByToken(token);
  if (!row || row.status === "DISPENSED") {
    return NextResponse.json({ error: "Receita inválida ou já dispensada" }, { status: 400 });
  }

  const storeAuthz = await authorizePharmacyPrescriptionValidate(session.user.id, session.user.role, {
    pharmacyStoreId: pharmacyStoreId || null,
    rowPharmacyStoreId: row.pharmacyStoreId,
  });
  if (!storeAuthz.ok) {
    return NextResponse.json({ error: storeAuthz.error }, { status: storeAuthz.status });
  }

  const storeId = storeAuthz.ok ? storeAuthz.storeId : null;
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

  const rxError = assertPrescriptionDispensable(rxFull);
  if (rxError) {
    return NextResponse.json({ error: rxError }, { status: 400 });
  }

  const linkedOrder = row.pharmacyOrderId
    ? await db.pharmacyOrder.findUnique({
        where: { id: row.pharmacyOrderId },
        select: { status: true },
      })
    : null;
  const orderError = assertOrderPaidForDispense(linkedOrder, Boolean(row.pharmacyOrderId));
  if (orderError) {
    return NextResponse.json({ error: orderError }, { status: 400 });
  }

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

  createAuditLog({
    userId: session.user.id,
    action: AuditAction.UPDATE_RECORD,
    resource: "PharmacyPrescriptionToken",
    resourceId: row.id,
    details: {
      event: "pharmacy_dispensed",
      tokenId: row.id,
      prescriptionId: row.prescriptionId,
      pharmacyOrderId: row.pharmacyOrderId,
      pharmacyStoreId: storeId,
    },
  }).catch(console.error);

  return NextResponse.json({ success: true, dispensedAt: now.toISOString() });
}
