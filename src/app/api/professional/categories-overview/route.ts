// src/app/api/professional/categories-overview/route.ts
// GET — overview of this professional's chart records, grouped by category group
// and category, with counts. Used by the "Categories" navigation (levels).
// Only counts MedicalDocuments that belong to a PatientRecord of this professional.
import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  
  // All chart records of this professional that HAVE a category.
  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId: ctx.professional.id,
      patientRecordId: { not: null },
      categoryId: { not: null },
    },
    select: { categoryId: true },
  });

  // Count per categoryId
  const countByCategory = new Map<string, number>();
  for (const d of docs) {
    if (!d.categoryId) continue;
    countByCategory.set(d.categoryId, (countByCategory.get(d.categoryId) || 0) + 1);
  }

  // Load all active categories (so empty ones can still show 0 if we want;
  // here we only return categories that have at least 1 record, grouped).
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: [{ groupOrder: "asc" }, { itemOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, groupName: true },
  });

  // Build groups -> categories (only those with count > 0)
  const groupsMap = new Map<string, { group: string; total: number; items: { id: string; name: string; slug: string; count: number }[] }>();
  for (const c of categories) {
    const count = countByCategory.get(c.id) || 0;
    if (count === 0) continue;
    if (!groupsMap.has(c.groupName)) {
      groupsMap.set(c.groupName, { group: c.groupName, total: 0, items: [] });
    }
    const g = groupsMap.get(c.groupName)!;
    g.items.push({ id: c.id, name: c.name, slug: c.slug, count });
    g.total += count;
  }

  // Records with a categoryId that is no longer active / not found → "Uncategorized-ish"
  // (kept out for simplicity; they still appear under their category if active)

  return NextResponse.json({ groups: Array.from(groupsMap.values()) });
}
