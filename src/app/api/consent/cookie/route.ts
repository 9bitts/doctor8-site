import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  granted: z.boolean(),
});

/** Persist cookie banner choice to Consent table (LGPD Art. 8). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || "";

  await db.consent.upsert({
    where: {
      userId_type_version: {
        userId: session.user.id,
        type: "COOKIE_CONSENT",
        version: "1.0",
      },
    },
    create: {
      userId: session.user.id,
      type: "COOKIE_CONSENT",
      version: "1.0",
      granted: parsed.data.granted,
      ipAddress: ip,
      userAgent,
    },
    update: {
      granted: parsed.data.granted,
      grantedAt: new Date(),
      revokedAt: parsed.data.granted ? null : new Date(),
      ipAddress: ip,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
