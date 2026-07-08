import { NextResponse } from "next/server";
import { requireProfessionalApi } from "@/lib/api-auth";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { EAP_BOOKING_SOURCE } from "@/lib/employer-eap-booking";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if ("error" in ctx) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, specialty: true },
  });
  if (!profile || !isPsychologistSpecialty(profile.specialty)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [links, upcomingEap, completedEapYear] = await Promise.all([
    db.employerLinkedPsychologist.findMany({
      where: { professionalId: profile.id },
      orderBy: { invitedAt: "desc" },
      include: {
        employerCompany: {
          select: { id: true, nomeFantasia: true, slug: true },
        },
      },
    }),
    db.appointment.findMany({
      where: {
        professionalId: profile.id,
        bookingSource: EAP_BOOKING_SOURCE,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        employerWorkforceMember: {
          select: {
            employerCompany: { select: { nomeFantasia: true } },
          },
        },
      },
    }),
    db.appointment.count({
      where: {
        professionalId: profile.id,
        bookingSource: EAP_BOOKING_SOURCE,
        status: "COMPLETED",
        scheduledAt: { gte: yearStart },
      },
    }),
  ]);

  return NextResponse.json({
    companies: links.map((l) => ({
      linkId: l.id,
      companyId: l.employerCompany.id,
      companyName: l.employerCompany.nomeFantasia,
      repassePercent: l.repassePercent,
      status: l.status,
      joinedAt: l.joinedAt?.toISOString() ?? l.invitedAt.toISOString(),
    })),
    stats: {
      activeCompanies: links.filter((l) => l.status === "ACTIVE").length,
      completedEapSessionsYear: completedEapYear,
      upcomingEapCount: upcomingEap.length,
    },
    upcomingSessions: upcomingEap.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
      companyName:
        a.employerWorkforceMember?.employerCompany.nomeFantasia ?? "EAP corporativo",
    })),
  });
}
