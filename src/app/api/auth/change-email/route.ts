// src/app/api/auth/change-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

const schema = z.object({
  newEmail: z.string().email("Invalid email address"),
  currentPassword: z.string().min(1, "Password is required to change your email"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { newEmail, currentPassword } = parsed.data;

  // Fetch user with profile names separately
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true, language: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "This is already your current email." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: newEmail.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "This email is already in use." }, { status: 409 });
  }

  if (user.passwordHash) {
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
    }
  }

  // Get first name for the email
  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true },
  });
  const professionalProfile = !patientProfile
    ? await db.professionalProfile.findUnique({
        where: { userId: session.user.id },
        select: { firstName: true },
      })
    : null;

  const firstName = patientProfile?.firstName || professionalProfile?.firstName || "there";

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const identifier = `email-change:${session.user.id}:${newEmail.toLowerCase()}`;

  await db.verificationToken.deleteMany({
    where: { identifier: { startsWith: `email-change:${session.user.id}:` } },
  });

  await db.verificationToken.create({
    data: { identifier, token, expires },
  });

  try {
    const { sendEmailChangeVerification } = await import("@/lib/email");
    await sendEmailChangeVerification({
      email: newEmail.toLowerCase(),
      name: firstName,
      token,
      isOldEmail: false,
      language: user.language,
    });
  } catch (e) {
    console.error("[CHANGE EMAIL SEND ERROR]", e);
  }

  return NextResponse.json({ success: true });
}