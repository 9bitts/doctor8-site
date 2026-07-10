import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendPasswordReset } from "@/lib/email";

function resolveFirstName(user: {
  patientProfile: { firstName: string } | null;
  professionalProfile: { firstName: string } | null;
  psychoanalystProfile: { firstName: string } | null;
}): string {
  try {
    if (user.patientProfile?.firstName) return decrypt(user.patientProfile.firstName);
    if (user.professionalProfile?.firstName) return decrypt(user.professionalProfile.firstName);
    if (user.psychoanalystProfile?.firstName) return decrypt(user.psychoanalystProfile.firstName);
  } catch {
    /* fall through */
  }
  return "there";
}

/** Admin — force password reset email for a user. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      language: true,
      patientProfile: { select: { firstName: true } },
      professionalProfile: { select: { firstName: true } },
      psychoanalystProfile: { select: { firstName: true } },
    },
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

  const language = user.language === "pt" || user.language === "es" ? user.language : "en";
  await sendPasswordReset({
    email: user.email,
    name: resolveFirstName(user),
    token,
    language,
  });

  return NextResponse.json({ ok: true, message: "Password reset email sent" });
}
