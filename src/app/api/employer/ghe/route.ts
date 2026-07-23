import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  sector: z.string().max(200).optional(),
  functions: z.string().max(2000).optional(),
  sectorId: z.string().optional().nullable(),
  jobFunctionId: z.string().optional().nullable(),
  workerCount: z.number().int().min(0).max(100000).optional(),
  hazardCodes: z.array(z.string()).optional(),
  notes: z.string().max(4000).optional(),
});

const patchSchema = createSchema.partial().extend({ id: z.string() });

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const groups = await db.employerGheGroup.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      sectorRef: { select: { id: true, name: true } },
      jobFunction: { select: { id: true, name: true } },
      _count: { select: { workforce: true, riskEntries: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let sectorLabel = parsed.data.sector;
  let functionsLabel = parsed.data.functions;

  if (parsed.data.sectorId) {
    const sector = await db.employerSector.findFirst({
      where: { id: parsed.data.sectorId, employerCompanyId: ctx.employerCompanyId },
    });
    if (!sector) return NextResponse.json({ error: "Setor inválido" }, { status: 400 });
    sectorLabel = sectorLabel || sector.name;
  }
  if (parsed.data.jobFunctionId) {
    const fn = await db.employerJobFunction.findFirst({
      where: { id: parsed.data.jobFunctionId, employerCompanyId: ctx.employerCompanyId },
    });
    if (!fn) return NextResponse.json({ error: "Função inválida" }, { status: 400 });
    functionsLabel = functionsLabel || fn.name;
  }

  const group = await db.employerGheGroup.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      name: parsed.data.name,
      sector: sectorLabel,
      functions: functionsLabel,
      sectorId: parsed.data.sectorId ?? null,
      jobFunctionId: parsed.data.jobFunctionId ?? null,
      workerCount: parsed.data.workerCount,
      hazardCodes: (parsed.data.hazardCodes ?? []) as Prisma.InputJsonValue,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerGheGroup.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await db.employerGheGroup.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      sector: parsed.data.sector,
      functions: parsed.data.functions,
      sectorId: parsed.data.sectorId === undefined ? undefined : parsed.data.sectorId,
      jobFunctionId: parsed.data.jobFunctionId === undefined ? undefined : parsed.data.jobFunctionId,
      workerCount: parsed.data.workerCount,
      hazardCodes:
        parsed.data.hazardCodes !== undefined
          ? (parsed.data.hazardCodes as Prisma.InputJsonValue)
          : undefined,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ group });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.employerGheGroup.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.employerGheGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
