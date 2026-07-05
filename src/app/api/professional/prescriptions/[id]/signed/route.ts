// src/app/api/professional/prescriptions/[id]/signed/route.ts
// GET — downloads the digitally signed (PAdES) PDF of a prescription.
// Returns a short-lived signed S3 URL via redirect. Access is restricted to the
// prescribing professional, the patient (by account) or an admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const prescription = await db.prescription.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      signedFileUrl: true,
      signatureStatus: true,
      professional: { select: { userId: true } },
      document: { select: { patientId: true } },
    },
  });

  if (!prescription) return new NextResponse("Not found", { status: 404 });
  if (prescription.signatureStatus !== "SIGNED" || !prescription.signedFileUrl)
    return new NextResponse("Prescription is not signed yet", { status: 409 });

  const isProfessional = prescription.professional?.userId === session.user.id;
  const isPatient = prescription.document?.patientId
    ? !!(await db.patientProfile.findFirst({
        where: { userId: session.user.id, id: prescription.document.patientId },
      }))
    : false;

  if (!isProfessional && !isPatient && session.user.role !== "ADMIN")
    return new NextResponse("Forbidden", { status: 403 });

  await audit.viewRecord(session.user.id, "Prescription", prescription.id);

  const url = await getSignedReadUrl(prescription.signedFileUrl, 900);
  return NextResponse.redirect(url);
}
