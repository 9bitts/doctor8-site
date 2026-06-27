// POST /api/auth/verify-sms-code ? validate SMS OTP and activate account

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAccountVerified } from "@/lib/account-verified";
import { smsOtpIdentifier } from "@/lib/sms-otp";

const MAX_ATTEMPTS = 5;

function attemptsIdentifier(email: string): string {
  return `sms-attempts:${email.toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "CODE_REQUIRED" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length !== 6) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        emailVerified: true,
        phoneVerified: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    if (isAccountVerified(user)) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const identifier = smsOtpIdentifier(normalizedEmail);
    const record = await db.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
    }

    const attemptsId = attemptsIdentifier(normalizedEmail);
    const attemptsRow = await db.verificationToken.findFirst({
      where: { identifier: attemptsId },
    });
    const attempts = attemptsRow ? parseInt(attemptsRow.token, 10) || 0 : 0;

    if (attempts >= MAX_ATTEMPTS) {
      await db.verificationToken.deleteMany({
        where: { identifier: { in: [identifier, attemptsId] } },
      });
      return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
    }

    if (record.token !== normalizedCode) {
      const next = attempts + 1;
      await db.verificationToken.deleteMany({ where: { identifier: attemptsId } });
      await db.verificationToken.create({
        data: {
          identifier: attemptsId,
          token: String(next),
          expires: record.expires,
        },
      });
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const now = new Date();
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { phoneVerified: now, emailVerified: now },
      }),
      db.verificationToken.deleteMany({
        where: {
          identifier: { in: [identifier, attemptsId] },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY SMS CODE]", error);
    return NextResponse.json({ error: "VERIFY_FAILED" }, { status: 500 });
  }
}
