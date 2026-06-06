// src/app/api/appointments/[id]/notes/route.ts
// Professional saves consultation notes during/after a call

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notes } = await req.json();

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });

  const appointment = await db.appointment.findFirst({
    where: { id: params.id, professionalId: professional?.id },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.appointment.update({
    where: { id: params.id },
    data: { notes: notes ? encrypt(notes) : null },
  });

  await audit.updateRecord(session.user.id, "Appointment", params.id);
  return NextResponse.json({ success: true });
}
