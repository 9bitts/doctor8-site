// GET — patient history fill status + whether already shared with a professional.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function isHistoryFilled(notesEncrypted: string | null): boolean {
  if (!notesEncrypted) return false;
  try {
    const data = JSON.parse(decrypt(notesEncrypted)) as Record<string, unknown>;
    const textFields = [
      "chiefComplaint", "allergies", "currentMedications", "pastSurgeries",
      "familyHistory", "bloodType", "patientName",
    ];
    if (textFields.some((k) => {
      const v = data[k];
      return typeof v === "string" && v.trim().length > 0;
    })) return true;
    const arrays = ["chronicConditions", "disabilities", "reviewSystems", "vaccines"];
    return arrays.some((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    where: { userId: session.user.id },
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
