import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCourseCreator } from "@/lib/courses/access";
import { uniqueCourseSlug } from "@/lib/courses/slug";
import { z } from "zod";
import { randomBytes } from "crypto";

const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  videoKey: z.string().max(500).optional().nullable(),
  videoUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
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

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(20000).optional(),
  shortDescription: z.string().max(500).optional(),
  profession: z.enum([
    "MEDICINE", "NURSING", "PHARMACY", "PSYCHOLOGY", "NUTRITION",
    "DENTISTRY", "INTEGRATIVE", "PSYCHOANALYSIS", "GENERAL",
  ]).default("GENERAL"),
  specialty: z.string().max(120).optional(),
  priceCents: z.number().int().min(0).max(99999999),
  workloadHours: z.number().min(0).max(9999).optional().nullable(),
  thumbnailKey: z.string().max(500).optional().nullable(),
  modules: z.array(moduleSchema).default([]),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).optional(),
});

async function requireCreator() {
  const session = await auth();
  if (!session?.user) return null;
  const ok = await isCourseCreator(session.user.id);
  if (!ok) return null;
  return session;
}

export async function GET() {
  const session = await requireCreator();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const courses = await db.course.findMany({
    where: { instructorUserId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { enrollments: true, modules: true } },
    },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const session = await requireCreator();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const suffix = randomBytes(4).toString("hex");
  const slug = uniqueCourseSlug(parsed.data.title, suffix);

  const course = await db.course.create({
    data: {
      slug,
      instructorUserId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      shortDescription: parsed.data.shortDescription,
      profession: parsed.data.profession,
      specialty: parsed.data.specialty,
      priceCents: parsed.data.priceCents,
      workloadHours: parsed.data.workloadHours ?? null,
      thumbnailKey: parsed.data.thumbnailKey ?? null,
      modules: {
        create: parsed.data.modules.map((m, mi) => ({
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
        })),
      },
    },
    include: {
      modules: { include: { lessons: true } },
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
