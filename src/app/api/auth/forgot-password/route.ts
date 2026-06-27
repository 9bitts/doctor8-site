// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";
import { nanoid } from "nanoid";
import { decrypt } from "@/lib/encryption";

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
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
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
