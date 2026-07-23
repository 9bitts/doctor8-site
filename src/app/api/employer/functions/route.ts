import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  sectorId: z.string().optional().nullable(),
  description: z.string().max(2000).optional(),
  weeklyHours: z.number().int().min(1).max(60).optional().nullable(),
});

const patchSchema = createSchema.partial().extend({ id: z.string() });

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const functions = await db.employerJobFunction.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      sector: { select: { id: true, name: true } },
      _count: { select: { workforce: true, gheGroups: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ functions });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.sectorId) {
    const sector = await db.employerSector.findFirst({
      where: { id: parsed.data.sectorId, employerCompanyId: ctx.employerCompanyId },
    });
    if (!sector) return NextResponse.json({ error: "Setor inválido" }, { status: 400 });
  }

  try {
    const jobFunction = await db.employerJobFunction.create({
      data: {
        employerCompanyId: ctx.employerCompanyId,
        name: parsed.data.name.trim(),
        sectorId: parsed.data.sectorId ?? null,
        description: parsed.data.description,
        weeklyHours: parsed.data.weeklyHours ?? null,
      },
    });
    return NextResponse.json({ function: jobFunction }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Função já existe" }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerJobFunction.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobFunction = await db.employerJobFunction.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      sectorId: parsed.data.sectorId === undefined ? undefined : parsed.data.sectorId,
      description: parsed.data.description,
      weeklyHours: parsed.data.weeklyHours === undefined ? undefined : parsed.data.weeklyHours,
    },
  });
  return NextResponse.json({ function: jobFunction });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.employerJobFunction.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.employerJobFunction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
