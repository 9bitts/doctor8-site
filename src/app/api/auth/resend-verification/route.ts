// src/app/api/auth/resend-verification/route.ts
// Resends the email verification link

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendEmailVerification } from "@/lib/email";
import { isAccountVerified } from "@/lib/account-verified";
import { sanitizeLoginFrom } from "@/lib/auth-portals";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email, from, callbackUrl } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "resend-verification:email", key: normalizedEmail, ...RATE_LIMITS.authEmail },
      { namespace: "resend-verification:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const safeCallback =
      typeof callbackUrl === "string"
      && callbackUrl.trim().startsWith("/")
      && !callbackUrl.trim().startsWith("//")
        ? callbackUrl.trim()
        : undefined;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        emailVerified: true,
        phoneVerified: true,
        language: true,
        patientProfile: { select: { firstName: true } },
        professionalProfile: { select: { firstName: true } },
        psychoanalystProfile: { select: { firstName: true } },
        integrativeTherapistProfile: { select: { firstName: true } },
        angelProfile: { select: { firstName: true } },
      },
    });

    // Always return success to avoid leaking whether an email is registered
    if (!user) {
      return NextResponse.json({ success: true });
    }

    if (isAccountVerified(user)) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const firstName =
      user.patientProfile?.firstName ||
      user.professionalProfile?.firstName ||
      user.psychoanalystProfile?.firstName ||
      user.integrativeTherapistProfile?.firstName ||
      user.angelProfile?.firstName ||
      "there";

    // Remove old tokens and create a new one
    await db.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    });

    await sendEmailVerification({
      email: email.toLowerCase(),
      name: firstName,
      token,
      language: user.language,
      from: sanitizeLoginFrom(from),
      callbackUrl: safeCallback,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESEND VERIFICATION ERROR]", error);
    return NextResponse.json(
      { error: "Failed to resend email. Please try again." },
      { status: 500 }
    );
  }
}
