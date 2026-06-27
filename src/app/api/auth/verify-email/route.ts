// src/app/api/auth/verify-email/route.ts
// Validates email verification token and marks email as verified

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function redirect(req: NextRequest, pathWithQuery: string) {
  return NextResponse.redirect(new URL(pathWithQuery, req.url));
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return redirect(req, "/login?error=InvalidVerificationLink");
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return redirect(req, "/login?error=InvalidVerificationLink");
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return redirect(
        req,
        `/verify-email?error=expired&email=${encodeURIComponent(verificationToken.identifier)}`,
      );
    }

    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({ where: { token } });

    return redirect(req, "/login?verified=true");
  } catch (error) {
    console.error("[VERIFY EMAIL ERROR]", error);
    return redirect(req, "/login?error=VerificationFailed");
  }
}
