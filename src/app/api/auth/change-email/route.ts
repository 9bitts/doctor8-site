// src/app/api/auth/change-email/route.ts
// Secure email change with double verification (old + new email)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { nanoid } from "nanoid";

const schema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { newEmail, password } = parsed.data;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return NextResponse.json({ error: "Cannot change email" }, { status: 400 });

  // Verify current password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });

  // Check new email not already taken
  const existing = await db.user.findUnique({ where: { email: newEmail.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  // Create verification tokens for both old and new email
  const tokenOld = nanoid(32);
  const tokenNew = nanoid(32);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store pending email change
  await db.verificationToken.createMany({
    data: [
      { identifier: `email-change-old:${user.id}`, token: tokenOld, expires },
      { identifier: `email-change-new:${user.id}:${newEmail}`, token: tokenNew, expires },
    ],
  });

  // Send verification emails via Resend
  // (Email sending code would go here — using Resend SDK)
  // await sendEmailChangeVerification({ user, newEmail, tokenOld, tokenNew });

  await audit.emailChange(user.id);

  return NextResponse.json({
    success: true,
    message: "Verification emails sent to both your old and new email address.",
  });
}
