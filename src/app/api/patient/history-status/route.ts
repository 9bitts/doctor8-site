// GET — patient history fill status + whether already shared with a professional.

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isPatientHistoryFilled } from "@/lib/patient-history-status";

function isHistoryFilled(notesEncrypted: string | null): boolean {
  return isPatientHistoryFilled(notesEncrypted);
}

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const { searchParams } = new URL(req.url);
  let professionalUserId = searchParams.get("professionalUserId");
  const professionalId = searchParams.get("professionalId");

  if (!professionalUserId && professionalId) {
    const pro = await db.professionalProfile.findUnique({
      where: { id: professionalId },
      select: { userId: true },
    });
    professionalUserId = pro?.userId ?? null;
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true, notes: true },
  });
  if (!patient) {
    return NextResponse.json({ historyFilled: false, alreadyShared: false });
  }

  const historyFilled = isHistoryFilled(patient.notes);

  let alreadyShared = false;
  if (professionalUserId) {
    const share = await db.sharedRecord.findFirst({
      where: {
        patientId: patient.id,
        sharedWithUserId: professionalUserId,
        document: {
          OR: [
            { title: { contains: "Medical History" } },
            { title: { contains: "Histórico" } },
            { title: { contains: "history" } },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    alreadyShared = !!share;
  }

  return NextResponse.json({ historyFilled, alreadyShared, professionalUserId });
}
