// ADMIN ONLY ? reveal phone numbers for support (audited PHI access).
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { safeDecryptPhone } from "@/lib/user-phone";
import { formatPhoneDisplay } from "@/lib/phone";

function decryptProfilePhone(stored: string | null | undefined): string {
  return safeDecryptPhone(stored).trim();
}

function displayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return formatPhoneDisplay(digits);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      role: true,
      phone: true,
      phoneVerified: true,
      patientProfile: { select: { id: true, phone: true } },
      professionalProfile: { select: { id: true, phone: true } },
      psychoanalystProfile: { select: { id: true, phone: true } },
      integrativeTherapistProfile: { select: { id: true, phone: true } },
      angelProfile: { select: { id: true, phone: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accountPhone = decryptProfilePhone(user.phone);
  const profileSources: { label: string; phone: string }[] = [];

  if (user.patientProfile?.phone) {
    const phone = decryptProfilePhone(user.patientProfile.phone);
    if (phone) profileSources.push({ label: "patientProfile", phone });
  }
  if (user.professionalProfile?.phone) {
    const phone = decryptProfilePhone(user.professionalProfile.phone);
    if (phone) profileSources.push({ label: "professionalProfile", phone });
  }
  if (user.psychoanalystProfile?.phone) {
    const phone = decryptProfilePhone(user.psychoanalystProfile.phone);
    if (phone) profileSources.push({ label: "psychoanalystProfile", phone });
  }
  if (user.integrativeTherapistProfile?.phone) {
    const phone = decryptProfilePhone(user.integrativeTherapistProfile.phone);
    if (phone) profileSources.push({ label: "integrativeTherapistProfile", phone });
  }
  if (user.angelProfile?.phone) {
    const phone = decryptProfilePhone(user.angelProfile.phone);
    if (phone) profileSources.push({ label: "angelProfile", phone });
  }

  const profilePhone = profileSources[0]?.phone ?? "";
  const hasPhone = Boolean(accountPhone || profilePhone);

  await createAuditLog({
    userId: session.user.id,
    action: AuditAction.VIEW_RECORD,
    resource: "UserPhone",
    resourceId: user.id,
    details: { targetRole: user.role, hasPhone },
  });

  return NextResponse.json({
    accountPhone: accountPhone ? displayPhone(accountPhone) : null,
    profilePhone: profilePhone ? displayPhone(profilePhone) : null,
    phoneVerified: !!user.phoneVerified,
    hasPhone,
  });
}
