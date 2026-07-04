import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";

const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  presentation: z.string().optional(),
  pharmaceuticalForm: z.string().optional(),
  itemKind: z.enum(["medication", "device", "phytotherapy"]).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
});

export async function GET() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const templates = await db.prescriptionTemplate.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      medications: t.medications,
      instructions: t.instructions || "",
      validDays: t.validDays,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tpl = await db.prescriptionTemplate.create({
    data: {
      professionalId: professional.id,
      name: parsed.data.name,
      medications: parsed.data.medications as object,
      instructions: parsed.data.instructions || null,
      validDays: parsed.data.validDays,
    },
  });

  return NextResponse.json({
    id: tpl.id,
    name: tpl.name,
    medications: tpl.medications,
    instructions: tpl.instructions || "",
    validDays: tpl.validDays,
  }, { status: 201 });
}
