import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendPasswordReset } from "@/lib/email";

/** Admin — force password reset email for a user. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, language: true },
  });
  if (!user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires,
    },
  });

  const lang = user.language === "pt" || user.language === "es" ? user.language : "en";
  await sendPasswordReset({ email: user.email, token, lang });

  return NextResponse.json({ ok: true, message: "Password reset email sent" });
}
