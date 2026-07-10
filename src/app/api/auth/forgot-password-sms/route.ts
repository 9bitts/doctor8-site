// POST /api/auth/forgot-password-sms ? send SMS code to reset password

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeSmsPhone } from "@/lib/phone";
import {
  isSmsUserFacingEnabled,
  sendOtpSms,
  startTwilioVerification,
  usesTwilioVerify,
} from "@/lib/sms";
import { generateSmsCode } from "@/lib/sms-otp";
import { encryptUserPhone, userPhonesMatch } from "@/lib/user-phone";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const COOLDOWN_MS = 60_000;
const RESET_SMS_PREFIX = "reset-sms:";

export async function POST(req: NextRequest) {
  try {
    if (!isSmsUserFacingEnabled()) {
      return NextResponse.json({ error: "SMS_UNAVAILABLE" }, { status: 503 });
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

    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "forgot-password-sms:email", key: normalizedEmail, ...RATE_LIMITS.authEmail },
      { namespace: "forgot-password-sms:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        deletedAt: true,
        passwordHash: true,
        phone: true,
        language: true,
      },
    });

    if (!user?.passwordHash || user.deletedAt) {
      return NextResponse.json({ success: true });
    }

    if (user.phone && !userPhonesMatch(user.phone, normalizedPhone)) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }

    const identifier = `${RESET_SMS_PREFIX}${normalizedEmail}`;
    const existing = await db.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });
    if (existing && existing.expires > new Date()) {
      const age = existing.expires.getTime() - Date.now();
      if (600_000 - age < COOLDOWN_MS) {
        return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
      }
    }

    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await db.verificationToken.deleteMany({ where: { identifier } });

    if (usesTwilioVerify()) {
      const sent = await startTwilioVerification(normalizedPhone);
      if (!sent.ok) {
        return NextResponse.json(
          { error: sent.error ?? "SEND_FAILED", detail: sent.detail },
          { status: 502 },
        );
      }
      await db.verificationToken.create({
        data: { identifier, token: normalizedPhone, expires },
      });
    } else {
      const code = generateSmsCode();
      const sent = await sendOtpSms({
        toPhone: normalizedPhone,
        code,
        language: user.language,
      });
      if (!sent.ok) {
        return NextResponse.json(
          { error: sent.error ?? "SEND_FAILED", detail: sent.detail },
          { status: 502 },
        );
      }
      await db.verificationToken.create({
        data: { identifier, token: code, expires },
      });
    }

    if (!user.phone) {
      await db.user.update({
        where: { id: user.id },
        data: { phone: encryptUserPhone(normalizedPhone) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FORGOT PASSWORD SMS]", error);
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }
}
