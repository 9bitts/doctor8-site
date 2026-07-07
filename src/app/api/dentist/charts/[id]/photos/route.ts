import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const createSchema = z.object({
  storageKey: z.string().min(1),
  category: z.enum(["INTRAORAL", "EXTRAORAL", "RADIOGRAPH", "BEFORE", "AFTER", "OTHER"]).optional(),
  toothNumbers: z.array(z.number()).optional(),
  caption: z.string().optional(),
  takenAt: z.string().datetime().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const photos = await db.dentalClinicalPhoto.findMany({
    where: { patientRecordId: params.id },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const photo = await db.dentalClinicalPhoto.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      storageKey: parsed.data.storageKey,
      category: parsed.data.category ?? "INTRAORAL",
      toothNumbers: parsed.data.toothNumbers ? (parsed.data.toothNumbers as Prisma.InputJsonValue) : undefined,
      caption: parsed.data.caption?.trim() || null,
      takenAt: parsed.data.takenAt ? new Date(parsed.data.takenAt) : new Date(),
    },
  });

  return NextResponse.json({ id: photo.id }, { status: 201 });
}
