import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const chairs = await db.dentalChair.findMany({
    where: { professionalId: professional.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ chairs });
}

export async function POST(req: NextRequest) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const count = await db.dentalChair.count({ where: { professionalId: professional.id } });
  const chair = await db.dentalChair.create({
    data: {
      professionalId: professional.id,
      name: parsed.data.name.trim(),
      sortOrder: parsed.data.sortOrder ?? count,
    },
  });

  return NextResponse.json({ id: chair.id, name: chair.name }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json();
  const { id, name, active } = body as { id?: string; name?: string; active?: boolean };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const chair = await db.dentalChair.findFirst({
    where: { id, professionalId: professional.id },
  });
  if (!chair) return NextResponse.json({ error: "Chair not found" }, { status: 404 });

  const updated = await db.dentalChair.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, name: updated.name, active: updated.active });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const chair = await db.dentalChair.findFirst({
    where: { id, professionalId: professional.id },
  });
  if (!chair) return NextResponse.json({ error: "Chair not found" }, { status: 404 });

  await db.dentalChair.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
