// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";
import { nanoid } from "nanoid";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Always return success to prevent email enumeration (security best practice)
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      patientProfile: { select: { firstName: true } },
      professionalProfile: { select: { firstName: true } },
    },
  });

  if (user && !user.deletedAt) {
    const token = nanoid(48);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.verificationToken.upsert({
      where: { identifier_token: { identifier: `reset:${user.id}`, token } },
      create: { identifier: `reset:${user.id}`, token, expires },
      update: { token, expires },
    });

    const firstName = user.patientProfile?.firstName
      ? decrypt(user.patientProfile.firstName)
      : user.professionalProfile?.firstName || "there";

    await sendPasswordReset({ email: user.email, name: firstName, token });
  }

  return NextResponse.json({ success: true });
}
