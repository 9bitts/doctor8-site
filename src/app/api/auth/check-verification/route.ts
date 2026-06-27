// src/app/api/auth/check-verification/route.ts
// Pre-login check: does this email need verification?
// Used by the login page to show a helpful message before attempting signIn

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAccountVerified } from "@/lib/account-verified";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ needsVerification: false });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { emailVerified: true, phoneVerified: true, passwordHash: true },
    });

    const needsVerification =
      !!user?.passwordHash && !isAccountVerified(user);

    return NextResponse.json({ needsVerification });
  } catch {
    return NextResponse.json({ needsVerification: false });
  }
}
