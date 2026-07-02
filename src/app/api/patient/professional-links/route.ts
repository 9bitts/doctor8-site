// GET pending + accepted links for the patient. POST revoke via [id]/revoke.
import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { linkDb } from "@/lib/patient-professional-link-db";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const links = await linkDb().findMany({
    where: {
      patientUserId: ctx.userId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const proUserIds = [...new Set(links.map((l) => l.professionalUserId))];
  const pros = proUserIds.length
    ? await db.professionalProfile.findMany({
        where: { userId: { in: proUserIds } },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          specialty: true,
        },
      })
    : [];
  const proByUserId = Object.fromEntries(pros.map((p) => [p.userId, p]));

  const rows = links.map((link) => {
    const pro = proByUserId[link.professionalUserId];
    return {
      id: link.id,
      status: link.status,
      createdAt: link.createdAt.toISOString(),
      professionalUserId: link.professionalUserId,
      name: pro ? `Dr. ${pro.firstName} ${pro.lastName}`.trim() : "Doctor",
      licenseNumber: pro?.licenseNumber ?? null,
      specialty: pro?.specialty ?? null,
    };
  });

  return NextResponse.json({ links: rows });
}
