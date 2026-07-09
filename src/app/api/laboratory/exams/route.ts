import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireLaboratory } from "@/lib/laboratory-auth";
import { db } from "@/lib/db";
import { slugifyOrganizationName } from "@/lib/cnpj";

export async function GET(req: NextRequest) {
  const ctx = await requireLaboratory();
  if ("error" in ctx) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const where: Prisma.LaboratoryExamItemWhereInput = {
    laboratoryId: ctx.laboratoryId,
    ...(q
      ? {
          examCatalog: {
            OR: [
              { searchName: { contains: q } },
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.laboratoryExamItem.findMany({
      where,
      include: {
        examCatalog: {
          select: {
            id: true,
            name: true,
            category: true,
            code: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    db.laboratoryExamItem.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      examCatalogId: item.examCatalogId,
      priceCents: item.priceCents,
      available: item.available,
      internalCode: item.internalCode,
      updatedAt: item.updatedAt.toISOString(),
      exam: item.examCatalog,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(300),
  category: z.enum(["BLOOD", "IMAGING"]).optional(),
  priceCents: z.number().int().positive(),
  code: z.string().optional(),
  internalCode: z.string().optional(),
  available: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireLaboratory();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lab = await db.laboratory.findUnique({ where: { id: ctx.laboratoryId } });
  if (!lab) {
    return NextResponse.json({ error: "Laboratório não encontrado" }, { status: 404 });
  }

  const defaultCategory =
    lab.labType === "IMAGING" ? "IMAGING" : lab.labType === "BLOOD" ? "BLOOD" : parsed.data.category;
  const category = parsed.data.category ?? defaultCategory ?? "BLOOD";

  const searchName = parsed.data.name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let examCatalog = await db.examCatalog.findFirst({
    where: { searchName, category },
  });

  if (!examCatalog) {
    let slug = slugifyOrganizationName(parsed.data.name);
    let attempt = 0;
    while (await db.examCatalog.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${slugifyOrganizationName(parsed.data.name)}-${attempt}`;
    }
    examCatalog = await db.examCatalog.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        category,
        code: parsed.data.code,
        searchName,
      },
    });
  }

  const item = await db.laboratoryExamItem.upsert({
    where: {
      laboratoryId_examCatalogId: {
        laboratoryId: ctx.laboratoryId,
        examCatalogId: examCatalog.id,
      },
    },
    create: {
      laboratoryId: ctx.laboratoryId,
      examCatalogId: examCatalog.id,
      priceCents: parsed.data.priceCents,
      internalCode: parsed.data.internalCode,
      available: parsed.data.available ?? true,
    },
    update: {
      priceCents: parsed.data.priceCents,
      internalCode: parsed.data.internalCode,
      available: parsed.data.available ?? true,
    },
    include: {
      examCatalog: {
        select: { id: true, name: true, category: true, code: true },
      },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
