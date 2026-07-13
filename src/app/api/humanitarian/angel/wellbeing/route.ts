import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  submitWellbeingCheckin,
  wellbeingCheckinDue,
} from "@/lib/humanitarian/angel-coordination";
import { db } from "@/lib/db";

const postSchema = z.object({
  score: z.number().int().min(1).max(5),
  note: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ANGEL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await db.angelProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const due = await wellbeingCheckinDue(profile.id);
  return NextResponse.json({ due });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ANGEL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await submitWellbeingCheckin({
    userId: session.user.id,
    score: parsed.data.score,
    note: parsed.data.note,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
