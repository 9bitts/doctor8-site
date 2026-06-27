// src/app/api/auth/verify-email/route.ts
// Validates email verification token and marks email as verified

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/email-core";

function redirect(pathWithQuery: string) {
  return NextResponse.redirect(new URL(pathWithQuery, getAppUrl()));
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return redirect("/verify-email/confirmed?error=invalid");
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return redirect("/verify-email/confirmed?error=invalid");
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
      return redirect(
        `/verify-email?error=expired&email=${encodeURIComponent(verificationToken.identifier)}`,
      );
    }

    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({ where: { token } });

    return redirect("/verify-email/confirmed");
  } catch (error) {
    console.error("[VERIFY EMAIL ERROR]", error);
    return redirect("/verify-email/confirmed?error=failed");
  }
}
