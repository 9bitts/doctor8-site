// POST /api/auth/reset-password-sms ? verify SMS code and set new password

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { normalizeSmsPhone } from "@/lib/phone";
import {
  checkTwilioVerification,
  usesTwilioVerify,
  isSmsUserFacingEnabled,
} from "@/lib/sms";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { encryptUserPhone, userPhonesMatch } from "@/lib/user-phone";

const RESET_SMS_PREFIX = "reset-sms:";

const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(8),
  code: z.string().min(6).max(6),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export async function POST(req: NextRequest) {
  try {
    if (!isSmsUserFacingEnabled()) {
      return NextResponse.json({ error: "SMS_UNAVAILABLE" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = schema.safeParse({
      ...body,
      code: String(body.code || "").replace(/\D/g, ""),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
    }

    const { email, phone, code, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = normalizeSmsPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, deletedAt: true, passwordHash: true, phone: true },
    });

    if (!user?.passwordHash || user.deletedAt) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const identifier = `${RESET_SMS_PREFIX}${normalizedEmail}`;
    const pending = await db.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });

    if (!pending || pending.expires < new Date()) {
      return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
    }

    if (usesTwilioVerify()) {
      if (pending.token !== normalizedPhone) {
        return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
      }
      const checked = await checkTwilioVerification(normalizedPhone, code);
      if (!checked.ok) {
        if (checked.error === "max_attempts") {
          await db.verificationToken.deleteMany({ where: { identifier } });
          return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
        }
        return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
      }
    } else {
      if (pending.token !== code) {
        return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
      }
      if (user.phone && !userPhonesMatch(user.phone, normalizedPhone)) {
        return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          phone: encryptUserPhone(normalizedPhone),
          failedLoginAttempts: 0,
          lockedUntil: null,
          tokenVersion: { increment: 1 },
        },
      }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.verificationToken.deleteMany({ where: { identifier } }),
    ]);

    await audit.passwordChange(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET PASSWORD SMS]", error);
    return NextResponse.json({ error: "RESET_FAILED" }, { status: 500 });
  }
}
