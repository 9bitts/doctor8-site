import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCourseCreator } from "@/lib/courses/access";
import { z } from "zod";

const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  videoKey: z.string().max(500).optional().nullable(),
  videoUrl: z.string().max(500).optional().nullable(),
  durationSecs: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPreview: z.boolean().default(false),
});

const moduleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  sortOrder: z.number().int().default(0),
  lessons: z.array(lessonSchema).default([]),
});

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(20000).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  profession: z.enum([
    "MEDICINE", "NURSING", "PHARMACY", "PSYCHOLOGY", "NUTRITION",
    "DENTISTRY", "INTEGRATIVE", "PSYCHOANALYSIS", "GENERAL",
  ]).optional(),
  specialty: z.string().max(120).optional().nullable(),
  priceCents: z.number().int().min(0).max(99999999).optional(),
  workloadHours: z.number().min(0).max(9999).optional().nullable(),
  thumbnailKey: z.string().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).optional(),
  modules: z.array(moduleSchema).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await isCourseCreator(session.user.id);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const course = await db.course.findFirst({
    where: { id: params.id, instructorUserId: session.user.id },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await isCourseCreator(session.user.id);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.course.findFirst({
    where: { id: params.id, instructorUserId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "PUBLISHED" || existing.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Curso publicado não pode ser editado. Contate o suporte." },
      { status: 400 },
    );
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modules, ...fields } = parsed.data;

  await db.$transaction(async (tx) => {
    if (modules) {
      await tx.courseLesson.deleteMany({
        where: { module: { courseId: params.id } },
      });
      await tx.courseModule.deleteMany({ where: { courseId: params.id } });
      for (const [mi, m] of modules.entries()) {
        await tx.courseModule.create({
          data: {
            courseId: params.id,
            title: m.title,
            sortOrder: m.sortOrder ?? mi,
            lessons: {
              create: m.lessons.map((l, li) => ({
                title: l.title,
                description: l.description,
                videoKey: l.videoKey || null,
                videoUrl: l.videoUrl || null,
                durationSecs: l.durationSecs ?? null,
                sortOrder: l.sortOrder ?? li,
                isPreview: l.isPreview,
              })),
            },
          },
        });
      }
    }

    await tx.course.update({
      where: { id: params.id },
      data: fields,
    });
  });

  const course = await db.course.findUnique({
    where: { id: params.id },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return NextResponse.json({ course });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await isCourseCreator(session.user.id);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.course.findFirst({
    where: { id: params.id, instructorUserId: session.user.id },
    select: { status: true, _count: { select: { enrollments: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing._count.enrollments > 0) {
    await db.course.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ archived: true });
  }
  await db.course.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
