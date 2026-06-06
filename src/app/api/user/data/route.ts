// src/app/api/user/data/route.ts
// GDPR: Right to data portability (export) and right to erasure (deletion)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { AuditAction } from "@prisma/client";

// GET — export all user data as JSON (GDPR right to portability)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, region: true, createdAt: true },
  });
  const patient = await db.patientProfile.findUnique({
    where: { userId },
    include: { medications: true, medicalDocuments: true },
  });
  const professional = await db.professionalProfile.findUnique({ where: { userId } });
  const medications = patient
    ? await db.medication.findMany({ where: { patientId: patient.id } })
    : [];
  const appointments = patient
    ? await db.appointment.findMany({ where: { patientId: patient.id }, take: 500 })
    : [];
  const messages = await db.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    take: 1000,
  });
  const consents = await db.consent.findMany({ where: { userId } });
  const auditLogs = await db.auditLog.findMany({
    where: { userId },
    take: 1000,
    orderBy: { createdAt: "desc" },
  });

  const exportData = {
    exportDate: new Date().toISOString(),
    platform: "Doctor8",
    notice: "This export contains all personal data associated with your account under GDPR Article 20.",
    account: user,
    profile: patient
      ? {
          ...patient,
          firstName: decrypt(patient.firstName),
          lastName: decrypt(patient.lastName),
          phone: patient.phone ? decrypt(patient.phone) : null,
          allergies: patient.allergies ? decrypt(patient.allergies) : null,
          chronicConditions: patient.chronicConditions ? decrypt(patient.chronicConditions) : null,
        }
      : professional,
    medications: medications.map((m) => ({
      ...m,
      name: decrypt(m.name),
      dosage: m.dosage ? decrypt(m.dosage) : null,
      frequency: m.frequency ? decrypt(m.frequency) : null,
    })),
    appointments,
    messages: messages.map((m) => ({
      ...m,
      content: "[Content omitted for privacy]",
    })),
    consents,
    auditLog: auditLogs,
  };

  await audit.exportData(userId);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="doctor8-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}

// DELETE — request account deletion (GDPR right to erasure)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { confirm } = await req.json();
  if (confirm !== "DELETE MY ACCOUNT") {
    return NextResponse.json({ error: 'Please send confirm: "DELETE MY ACCOUNT"' }, { status: 400 });
  }

  const userId = session.user.id;
  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { deletionScheduledAt: deletionDate },
    }),
    db.dataExportRequest.create({
      data: { userId, type: "deletion", status: "pending", notes: `Scheduled for: ${deletionDate.toISOString()}` },
    }),
    db.session.deleteMany({ where: { userId } }),
  ]);

  await db.auditLog.create({
    data: { userId, action: AuditAction.DATA_DELETION_REQUEST, resource: "User" },
  });

  return NextResponse.json({
    success: true,
    message: "Your account has been scheduled for deletion.",
    scheduledFor: deletionDate,
    notice: "You have 30 days to cancel this request by contacting support@doctor8.app",
  });
}