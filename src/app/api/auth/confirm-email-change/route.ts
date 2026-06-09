// src/app/api/auth/confirm-email-change/route.ts
// Validates the email change token and applies the new email

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/login?error=InvalidLink`);
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({ where: { token } });

    if (!verificationToken || !verificationToken.identifier.startsWith("email-change:")) {
      return NextResponse.redirect(`${APP_URL}/login?error=InvalidLink`);
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(`${APP_URL}/login?error=LinkExpired`);
    }

    // identifier format: "email-change:{userId}:{newEmail}"
    const parts = verificationToken.identifier.split(":");
    const userId = parts[1];
    const newEmail = parts.slice(2).join(":");

    // Check new email not taken by someone else
    const existing = await db.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(`${APP_URL}/login?error=EmailTaken`);
    }

    await db.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "EMAIL_CHANGE",
        resource: "User",
        resourceId: userId,
      },
    });

    await db.verificationToken.delete({ where: { token } });

    return NextResponse.redirect(`${APP_URL}/login?emailChanged=true`);
  } catch (error) {
    console.error("[CONFIRM EMAIL CHANGE ERROR]", error);
    return NextResponse.redirect(`${APP_URL}/login?error=ChangeFailed`);
  }
}
