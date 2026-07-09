import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomInt } from "crypto";
import { sendTransactionalEmail } from "@/lib/email-core";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

/** Sends a 6-digit OTP to the current email for OAuth-only users before email change. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "change-email-reauth:ip", key: ip, ...RATE_LIMITS.authIp },
    { namespace: "change-email-reauth:user", key: session.user.id, ...RATE_LIMITS.authEmail },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true, language: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.passwordHash) {
    return NextResponse.json({ error: "Password re-auth is sufficient." }, { status: 400 });
  }

  const code = String(randomInt(100000, 999999));
  const identifier = `email-change-reauth:${session.user.id}`;
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: { identifier, token: code, expires },
  });

  try {
    await sendTransactionalEmail({
      to: user.email,
      subject: "Doctor8 — código de verificação",
      html: `<p>Seu código para alterar o e-mail: <strong>${code}</strong></p><p>Válido por 15 minutos.</p>`,
    });
  } catch (e) {
    console.error("[CHANGE-EMAIL REAUTH]", e);
    return NextResponse.json({ error: "Erro ao processar solicitação." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
