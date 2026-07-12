import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";
import {
  isAcceptableTakenAt,
  isValidFdiToothNumber,
  isValidRecordsStorageKey,
} from "@/lib/upload-key-validation";

const fdiToothSchema = z.number().int().refine(isValidFdiToothNumber, { message: "Invalid FDI tooth number" });

const createSchema = z.object({
  storageKey: z.string().min(1).max(500),
  category: z.enum(["INTRAORAL", "EXTRAORAL", "RADIOGRAPH", "BEFORE", "AFTER", "OTHER"]).optional(),
  toothNumbers: z.array(fdiToothSchema).max(64).optional(),
  caption: z.string().max(2000).optional(),
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

  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      let imageUrl: string | null = null;
      if (isValidRecordsStorageKey(photo.storageKey, params.id)) {
        try {
          imageUrl = await getSignedReadUrl(photo.storageKey, 900);
        } catch {
          imageUrl = null;
        }
      }
      return { ...photo, imageUrl };
    }),
  );

  return NextResponse.json({ photos: withUrls });
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

  if (!isValidRecordsStorageKey(parsed.data.storageKey, params.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.takenAt && !isAcceptableTakenAt(parsed.data.takenAt)) {
    return NextResponse.json({ error: "takenAt cannot be in the future" }, { status: 400 });
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
