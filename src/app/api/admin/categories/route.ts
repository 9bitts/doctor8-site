// src/app/api/admin/categories/route.ts
// ADMIN ONLY.
// GET  — list all categories (active + inactive), grouped, with usage counts.
// POST — create a new category.
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  groupName: z.string().min(1).max(120),
  groupOrder: z.number().int().min(0).max(999).optional(),
  itemOrder: z.number().int().min(0).max(999).optional(),
  legacyType: z.string().max(60).optional().or(z.literal("")),
  icon: z.string().max(60).optional().or(z.literal("")),
});

function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const categories = await db.category.findMany({
    orderBy: [{ groupOrder: "asc" }, { itemOrder: "asc" }, { name: "asc" }],
  });

  // Usage count per category (how many documents use it)
  const docs = await db.medicalDocument.findMany({
    where: { categoryId: { not: null } },
    select: { categoryId: true },
  });
  const usage = new Map<string, number>();
  for (const d of docs) {
    if (!d.categoryId) continue;
    usage.set(d.categoryId, (usage.get(d.categoryId) || 0) + 1);
  }

  const groupsMap = new Map<
    string,
    {
      group: string;
      groupOrder: number;
      items: Array<{
        id: string;
        name: string;
        slug: string;
        groupName: string;
        groupOrder: number;
        itemOrder: number;
        icon: string | null;
        legacyType: string | null;
        isSystem: boolean;
        active: boolean;
        usageCount: number;
      }>;
    }
  >();
  for (const c of categories) {
    if (!groupsMap.has(c.groupName)) {
      groupsMap.set(c.groupName, { group: c.groupName, groupOrder: c.groupOrder, items: [] });
    }
    groupsMap.get(c.groupName)!.items.push({
      id: c.id,
      name: c.name,
      slug: c.slug,
      groupName: c.groupName,
      groupOrder: c.groupOrder,
      itemOrder: c.itemOrder,
      icon: c.icon,
      legacyType: c.legacyType,
      isSystem: c.isSystem,
      active: c.active,
      usageCount: usage.get(c.id) || 0,
    });
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => a.groupOrder - b.groupOrder);
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  // Unique slug
  let base = slugify(d.name) || "categoria";
  let slug = base;
  let n = 1;
  while (await db.category.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const created = await db.category.create({
    data: {
      name: d.name,
      slug,
      groupName: d.groupName,
      groupOrder: d.groupOrder ?? 0,
      itemOrder: d.itemOrder ?? 0,
      legacyType: d.legacyType ? d.legacyType : null,
      icon: d.icon ? d.icon : null,
      isSystem: false,
      active: true,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
