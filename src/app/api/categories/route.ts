// src/app/api/categories/route.ts
// GET — returns all active categories, grouped, ordered.
// Shared by the professional (chart) and patient (documents) forms.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: [{ groupOrder: "asc" }, { itemOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      groupName: true,
      icon: true,
      legacyType: true,
    },
  });

  // Build an ordered list of groups, each with its categories
  const groupsMap = new Map<string, { group: string; items: typeof categories }>();
  for (const c of categories) {
    if (!groupsMap.has(c.groupName)) {
      groupsMap.set(c.groupName, { group: c.groupName, items: [] });
    }
    groupsMap.get(c.groupName)!.items.push(c);
  }

  return NextResponse.json({
    categories,
    groups: Array.from(groupsMap.values()),
  });
}
