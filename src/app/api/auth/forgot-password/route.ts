// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";
import { nanoid } from "nanoid";
import { decrypt } from "@/lib/encryption";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { sanitizeLoginFrom } from "@/lib/auth-portals";

function resolveFirstName(user: {
  patientProfile: { firstName: string } | null;
  professionalProfile: { firstName: string } | null;
  psychoanalystProfile: { firstName: string } | null;
}): string {
  try {
    if (user.patientProfile?.firstName) {
      return decrypt(user.patientProfile.firstName);
    }
    if (user.professionalProfile?.firstName) {
      return decrypt(user.professionalProfile.firstName);
    }
    if (user.psychoanalystProfile?.firstName) {
      return decrypt(user.psychoanalystProfile.firstName);
    }
  } catch {
    /* fall through */
  }
  return "there";
}

export async function POST(req: NextRequest) {
  try {
    const { email, from } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const safeFrom = sanitizeLoginFrom(typeof from === "string" ? from : undefined);

    const normalizedEmail = email.toLowerCase();
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "forgot-password:email", key: normalizedEmail, ...RATE_LIMITS.authEmail },
      { namespace: "forgot-password:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        language: true,
        patientProfile: { select: { firstName: true } },
        professionalProfile: { select: { firstName: true } },
        psychoanalystProfile: { select: { firstName: true } },
      },
    });

    if (user && !user.deletedAt) {
      const token = nanoid(48);
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      const identifier = `reset:${user.id}`;

      await db.verificationToken.deleteMany({ where: { identifier } });
      await db.verificationToken.create({
        data: { identifier, token, expires },
      });

      try {
        await sendPasswordReset({
          email: user.email,
          name: resolveFirstName(user),
          token,
          language: user.language,
          from: safeFrom,
        });
      } catch (emailError) {
        console.error("[FORGOT PASSWORD EMAIL]", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FORGOT PASSWORD]", error);
    return NextResponse.json({ success: true });
  }
}
