import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { userHasAnyProfile } from "@/lib/user-profile-complete";
import { createSignupProfile } from "@/lib/signup-profile-create";
import { saveRegistrationPhone } from "@/lib/save-registration-phone";
import { parseRegistrationPhone } from "@/lib/international-phone";
import { resolveRoleHome } from "@/lib/role-home";

import { OAUTH_PROFESSION_SLUGS } from "@/lib/oauth-signup-intent";

const completeSchema = z.object({
  role: z.enum(["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]),
  professionalKind: z.enum(["psychologist"]).optional(),
  profession: z.enum(OAUTH_PROFESSION_SLUGS).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phoneDdi: z.string().min(1).max(4).optional(),
  phoneNational: z.string().min(6).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      email: true,
      region: true,
      patientProfile: { select: { id: true } },
      professionalProfile: { select: { id: true } },
      psychoanalystProfile: { select: { id: true } },
      integrativeTherapistProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (userHasAnyProfile(user)) {
    return NextResponse.json({ error: "Account already complete" }, { status: 409 });
  }

  const { role, professionalKind, profession, firstName, lastName, phoneDdi, phoneNational } = parsed.data;

  let phoneE164: string | null = null;
  if (phoneDdi && phoneNational) {
    const phoneParsed = parseRegistrationPhone({ phoneDdi, phoneNational });
    if ("error" in phoneParsed) {
      return NextResponse.json({ error: { phoneNational: [phoneParsed.error] } }, { status: 400 });
    }
    phoneE164 = phoneParsed.e164;
  }

  const emailLocal = (user.email.split("@")[0] || "User").replace(/[._+]/g, " ");
  const profileFirstName = firstName?.trim() || emailLocal.split(" ")[0] || "User";
  const profileLastName = lastName?.trim() || emailLocal.split(" ").slice(1).join(" ") || "";

  await db.$transaction(async (tx) => {
    if (user.role !== role) {
      await tx.user.update({
        where: { id: user.id },
        data: { role: role as UserRole },
      });
    }

    await createSignupProfile(tx, {
      userId: user.id,
      role,
      professionalKind: professionalKind ?? null,
      profession: profession ?? null,
      firstName: profileFirstName,
      lastName: profileLastName,
      email: user.email,
      country: user.region,
    });

    if (phoneE164) {
      await saveRegistrationPhone(tx, user.id, role as UserRole, phoneE164);
    }
  });

  let specialty: string | null = null;
  if (role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: user.id },
      select: { specialty: true },
    });
    specialty = profile?.specialty ?? null;
  }

  return NextResponse.json({
    success: true,
    redirectTo: resolveRoleHome(role, specialty),
  });
}
