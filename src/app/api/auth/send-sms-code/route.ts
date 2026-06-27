// POST /api/auth/send-sms-code ? send 6-digit verification code via SMS

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAccountVerified } from "@/lib/account-verified";
import { normalizeSmsPhone } from "@/lib/phone";
import { sendVerificationSms, isSmsConfigured } from "@/lib/sms";
import {
  generateSmsCode,
  smsOtpIdentifier,
  SMS_OTP_TTL_MS,
  SMS_RESEND_COOLDOWN_MS,
} from "@/lib/sms-otp";

export async function POST(req: NextRequest) {
  try {
    if (!isSmsConfigured()) {
      return NextResponse.json(
        { error: "SMS_UNAVAILABLE" },
        { status: 503 },
      );
    }

    const { email, phone } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = normalizeSmsPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        emailVerified: true,
        phoneVerified: true,
        language: true,
        passwordHash: true,
      },
    });

    // Avoid leaking whether the email exists
    if (!user?.passwordHash) {
      return NextResponse.json({ success: true });
    }

    if (isAccountVerified(user)) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const identifier = smsOtpIdentifier(normalizedEmail);
    const existing = await db.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });

    if (existing && existing.expires.getTime() > Date.now()) {
      const createdApprox =
        existing.expires.getTime() - SMS_OTP_TTL_MS;
      if (Date.now() - createdApprox < SMS_RESEND_COOLDOWN_MS) {
        return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
      }
    }

    const code = generateSmsCode();
    const expires = new Date(Date.now() + SMS_OTP_TTL_MS);

    await db.verificationToken.deleteMany({ where: { identifier } });
    await db.verificationToken.create({
      data: { identifier, token: code, expires },
    });

    await db.user.update({
      where: { id: user.id },
      data: { phone: normalizedPhone },
    });

    const sent = await sendVerificationSms({
      toPhone: normalizedPhone,
      code,
      language: user.language,
    });

    if (!sent.ok) {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return NextResponse.json(
        { error: sent.skipped ? "SMS_UNAVAILABLE" : "SEND_FAILED" },
        { status: sent.skipped ? 503 : 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SEND SMS CODE]", error);
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }
}
