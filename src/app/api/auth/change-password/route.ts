// src/app/api/auth/change-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return NextResponse.json({ error: "Cannot change password for this account" }, { status: 400 });

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    // HIPAA: invalidate all sessions on password change
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await audit.passwordChange(user.id);
  return NextResponse.json({ success: true });
}
