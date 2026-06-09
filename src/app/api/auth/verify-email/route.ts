// src/app/api/auth/verify-email/route.ts
// Validates email verification token and marks email as verified

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/login?error=InvalidVerificationLink`);
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(`${APP_URL}/login?error=InvalidVerificationLink`);
    }

    if (verificationToken.expires < new Date()) {
      // Delete expired token so user can request a new one
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(
        `${APP_URL}/verify-email?error=expired&email=${encodeURIComponent(verificationToken.identifier)}`
      );
    }

    // Mark user email as verified
    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete used token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.redirect(`${APP_URL}/login?verified=true`);
  } catch (error) {
    console.error("[VERIFY EMAIL ERROR]", error);
    return NextResponse.redirect(`${APP_URL}/login?error=VerificationFailed`);
  }
}
