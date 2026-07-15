import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeSncrSessionToken, saveSncrAccessToken } from "@/lib/sncr/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const sessionId = req.nextUrl.searchParams.get("session_id");
  const professionalId = req.nextUrl.searchParams.get("professionalId");

  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/professional/prescriptions?sncrAuth=missing_session", req.url),
    );
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional || (professionalId && professionalId !== professional.id)) {
    return NextResponse.redirect(
      new URL("/professional/prescriptions?sncrAuth=forbidden", req.url),
    );
  }

  try {
    const { accessToken } = await exchangeSncrSessionToken(sessionId);
    const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
    await saveSncrAccessToken(professional.id, accessToken, expiresAt);
    return NextResponse.redirect(
      new URL("/professional/prescriptions?sncrAuth=success", req.url),
    );
  } catch (e) {
    console.error("[SNCR AUTH]", e);
    return NextResponse.redirect(
      new URL("/professional/prescriptions?sncrAuth=error", req.url),
    );
  }
}
