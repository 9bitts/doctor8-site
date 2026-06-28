// ADMIN ONLY ? manually mark a user's email as verified (e.g. after phone/onboarding support).

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.emailVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.deleteMany({ where: { identifier: user.email } });

  return NextResponse.json({ success: true, emailVerified: true });
}
