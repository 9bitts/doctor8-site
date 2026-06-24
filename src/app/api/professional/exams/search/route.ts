// GET — search CBHPM procedures for exam requests (professional only).
// Example: /api/professional/exams/search?q=ferro&chapter=4

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeExamQuery, resolveExamSearch } from "@/lib/exam-search-aliases";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const chapter = searchParams.get("chapter") || undefined;

  if (q.length < 2) {
    return NextResponse.json({ exams: [] });
  }

  const qNorm = normalizeExamQuery(q);
  const qCode = q.replace(/\D/g, "");
  const isCodeQuery = /^\d/.test(q) && qCode.length >= 2;
  const { codes: aliasCodes, searchTerms } = resolveExamSearch(q);

  const nameConditions = searchTerms.map((term) => ({
    searchName: { contains: term },
  }));

  const orConditions = isCodeQuery
    ? [
        { code: { startsWith: q } },
        { searchCode: { contains: qCode } },
        ...nameConditions,
      ]
    : nameConditions;

  const select = {
    id: true,
    code: true,
    name: true,
    chapter: true,
    groupName: true,
  } as const;

  const baseWhere = {
    active: true,
    ...(chapter ? { chapter } : {}),
  };

  const [byAliasCode, byName] = await Promise.all([
    aliasCodes.length > 0
      ? db.cbhpmCatalog.findMany({
          where: { ...baseWhere, code: { in: aliasCodes } },
          select,
        })
      : Promise.resolve([]),
    db.cbhpmCatalog.findMany({
      where: { ...baseWhere, OR: orConditions },
      select,
      orderBy: [{ chapter: "asc" }, { name: "asc" }],
      take: 20,
    }),
  ]);

  const seen = new Set<string>();
  const exams = [];
  for (const row of [...byAliasCode, ...byName]) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    exams.push(row);
    if (exams.length >= 20) break;
  }

  return NextResponse.json({ exams });
}
