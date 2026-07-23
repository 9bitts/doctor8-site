import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  sector: z.string().max(200).optional(),
  functions: z.string().max(2000).optional(),
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
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await db.employerGheGroup.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      name: parsed.data.name,
      sector: parsed.data.sector,
      functions: parsed.data.functions,
      workerCount: parsed.data.workerCount,
      hazardCodes: (parsed.data.hazardCodes ?? []) as Prisma.InputJsonValue,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
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
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
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
