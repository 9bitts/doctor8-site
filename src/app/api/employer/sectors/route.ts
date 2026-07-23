import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const patchSchema = createSchema.partial().extend({ id: z.string() });

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const sectors = await db.employerSector.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      _count: { select: { jobFunctions: true, workforce: true, gheGroups: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ sectors });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const sector = await db.employerSector.create({
      data: {
        employerCompanyId: ctx.employerCompanyId,
        name: parsed.data.name.trim(),
        description: parsed.data.description,
      },
    });
    return NextResponse.json({ sector }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Setor já existe" }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerSector.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sector = await db.employerSector.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      description: parsed.data.description,
    },
  });
  return NextResponse.json({ sector });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.employerSector.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.employerSector.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
