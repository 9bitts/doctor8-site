import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidIanaTimeZone } from "@/lib/timezone";
import { z } from "zod";

const schema = z.object({
  timezone: z.string().min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true } as never,
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ timezone: (user as { timezone: string }).timezone });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!isValidIanaTimeZone(parsed.data.timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { timezone: parsed.data.timezone } as never,
  });

  return NextResponse.json({ success: true, timezone: parsed.data.timezone });
}
