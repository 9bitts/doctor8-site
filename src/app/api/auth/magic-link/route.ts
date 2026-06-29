// Passwordless login for public booking ? sends a one-time magic link.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { sendMagicLinkLogin } from "@/lib/email";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ConsentType } from "@prisma/client";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  attachLinkedDocumentsToPatientProfile,
  linkChartsToPatientOnSignup,
  linkChartsToPatientUser,
} from "@/lib/patient-chart-link";

const MAGIC_LINK_TTL_MS = 30 * 60 * 1000;

function safeCallback(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/patient/appointments";
  }
  return raw.slice(0, 500);
}

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  callbackUrl: z.string().optional(),
  language: z.enum(["en", "pt", "es"]).optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const callbackUrl = safeCallback(parsed.data.callbackUrl);
  const language = parsed.data.language || "pt";

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "magic-link:email", key: email, ...RATE_LIMITS.authEmail },
    { namespace: "magic-link:ip", key: ip, ...RATE_LIMITS.authIp },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const userAgent = req.headers.get("user-agent") || "unknown";

  let userId: string;
  let displayName = parsed.data.firstName;

  const existing = await db.user.findUnique({
    where: { email },
    include: { patientProfile: { select: { firstName: true } } },
  });

  if (existing) {
    if (existing.deletedAt || existing.role !== "PATIENT") {
      return NextResponse.json({ success: true });
    }
    userId = existing.id;
    if (existing.patientProfile?.firstName) {
      try {
        displayName = decrypt(existing.patientProfile.firstName);
      } catch {
        displayName = parsed.data.firstName;
      }
    }
    try {
      await linkChartsToPatientUser(userId, email);
    } catch (linkError) {
      console.error("[MAGIC LINK LINK ERROR]", linkError);
    }
  } else {
    const newUser = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          role: "PATIENT",
          region: "BR",
          language,
        },
      });

      await tx.patientProfile.create({
        data: {
          userId: newUser.id,
          firstName: encrypt(parsed.data.firstName),
          lastName: encrypt(parsed.data.lastName),
        },
      });

      await linkChartsToPatientOnSignup(tx, newUser.id, email);

      await tx.consent.createMany({
        data: [
          {
            userId: newUser.id,
            type: ConsentType.TERMS_OF_SERVICE,
            version: "1.0",
            granted: true,
            ipAddress: ip,
            userAgent,
          },
          {
            userId: newUser.id,
            type: ConsentType.PRIVACY_POLICY,
            version: "1.0",
            granted: true,
            ipAddress: ip,
            userAgent,
          },
        ],
      });

      return newUser;
    });

    userId = newUser.id;

    try {
      await attachLinkedDocumentsToPatientProfile(newUser.id);
    } catch (linkError) {
      console.error("[MAGIC LINK LINK ERROR]", linkError);
    }
  }

  const token = nanoid(48);
  const expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.verificationToken.deleteMany({
    where: { identifier: `magic:${userId}` },
  });
  await db.verificationToken.create({
    data: {
      identifier: `magic:${userId}`,
      token,
      expires,
    },
  });

  try {
    await sendMagicLinkLogin({
      email,
      name: displayName,
      token,
      callbackUrl,
      language,
    });
  } catch (emailError) {
    console.error("[MAGIC LINK EMAIL ERROR]", emailError);
    return NextResponse.json(
      { error: { general: ["Could not send email. Try again."] } },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true });
}
