// src/app/api/auth/check-verification/route.ts
// Pre-login check: does this email need verification?
// Used by the login page to show a helpful message before attempting signIn

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ needsVerification: false });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { emailVerified: true, passwordHash: true },
    });

    // Only flag if: user exists + has a password (not OAuth-only) + not verified
    const needsVerification =
      !!user?.passwordHash && !user?.emailVerified;

    return NextResponse.json({ needsVerification });
  } catch {
    return NextResponse.json({ needsVerification: false });
  }
}
