// src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
    .regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { token, password } = parsed.data;

  // Find the token
  const record = await db.verificationToken.findUnique({ where: { token } });

  if (!record || !record.identifier.startsWith("reset:") || record.expires < new Date()) {
    const expired = record && record.expires < new Date();
    return NextResponse.json(
      { error: expired ? "expired" : "invalid" },
      { status: 400 },
    );
  }

  const userId = record.identifier.replace("reset:", "");
  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    db.session.deleteMany({ where: { userId } }), // Invalidate all sessions
    db.verificationToken.delete({ where: { token } }), // Use token only once
  ]);

  await audit.passwordChange(userId);
  return NextResponse.json({ success: true });
}
