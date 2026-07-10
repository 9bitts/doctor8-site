import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

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

  await db.$transaction(async (tx) => {
    await createRegisterConsents(tx, session.user!.id, ip, userAgent, {
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
  });

  return NextResponse.json({ ok: true });
}
