import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

const postSchema = z.object({
  track: z.enum([
    "ESCUTA",
    "CAMPO",
    "ENTREGAS",
    "PROFISSIONAL",
    "INTERPRETE",
    "RETAGUARDA",
    "EDUCADOR",
    "EMBAIXADOR",
  ]),
  courseId: z.string().min(1),
  required: z.boolean().optional(),
});

const deleteSchema = z.object({
  track: postSchema.shape.track,
  courseId: z.string().min(1),
});

function randomId(): string {
  return randomBytes(16).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [requirements, courses] = await Promise.all([
    db.angelTrackTrainingRequirement.findMany({
      orderBy: [{ track: "asc" }, { courseId: "asc" }],
    }),
    db.course.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true },
    }),
  ]);

  return NextResponse.json({ requirements, courses });
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

  const course = await db.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const row = await db.angelTrackTrainingRequirement.upsert({
    where: {
      track_courseId: {
        track: parsed.data.track,
        courseId: parsed.data.courseId,
      },
    },
    create: {
      id: randomId(),
      track: parsed.data.track,
      courseId: parsed.data.courseId,
      required: parsed.data.required ?? true,
    },
    update: {
      required: parsed.data.required ?? true,
    },
  });

  return NextResponse.json({ requirement: row });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.angelTrackTrainingRequirement.deleteMany({
    where: {
      track: parsed.data.track,
      courseId: parsed.data.courseId,
    },
  });

  return NextResponse.json({ success: true });
}
