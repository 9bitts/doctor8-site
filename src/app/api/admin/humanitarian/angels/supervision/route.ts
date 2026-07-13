import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  addSupervisionNote,
  getAngelBurnoutSignal,
} from "@/lib/humanitarian/angel-coordination";

const postSchema = z.object({
  profileId: z.string(),
  note: z.string().min(3).max(4000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profileId = new URL(req.url).searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  const profile = await db.angelProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      supervisionNotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, note: true, authorId: true, createdAt: true },
      },
      wellbeingCheckins: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, score: true, note: true, createdAt: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const burnout = await getAngelBurnoutSignal(profile.userId);

  return NextResponse.json({
    profile: {
      id: profile.id,
      userId: profile.userId,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
    },
    burnout,
    supervisionNotes: profile.supervisionNotes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    wellbeingCheckins: profile.wellbeingCheckins.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.angelProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await addSupervisionNote({
    profileId: parsed.data.profileId,
    authorId: session.user.id,
    note: parsed.data.note,
  });

  return NextResponse.json({ success: true });
}
