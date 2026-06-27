import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { cancelHumanitarianEntry } from "@/lib/humanitarian/dispatcher";

const schema = z.object({ entryId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await cancelHumanitarianEntry(parsed.data.entryId, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
