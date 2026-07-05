import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  presentation: z.string().optional(),
  pharmaceuticalForm: z.string().optional(),
  itemKind: z.enum(["medication", "device", "phytotherapy"]).optional(),
}).superRefine((item, ctx) => {
  const kind = item.itemKind || "medication";
  if (kind !== "phytotherapy") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "only phytotherapy allowed", path: ["itemKind"] });
  }
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
});

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const templates = await db.prescriptionTemplate.findMany({
    where: { integrativeTherapistId: therapist.id },
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
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const template = await db.prescriptionTemplate.create({
    data: {
      integrativeTherapistId: therapist.id,
      name: parsed.data.name,
      medications: parsed.data.medications as object[],
      instructions: parsed.data.instructions || null,
      validDays: parsed.data.validDays,
    },
  });

  return NextResponse.json({
    id: template.id,
    name: template.name,
    medications: template.medications,
    instructions: template.instructions || "",
    validDays: template.validDays,
  }, { status: 201 });
}
