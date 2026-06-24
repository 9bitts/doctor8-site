// GET — search CBHPM procedures for exam requests (professional only).
// Example: /api/professional/exams/search?q=ferro&chapter=4

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

  const qNorm = normalize(q);
  const qCode = q.replace(/\D/g, "");

  const isCodeQuery = /^\d/.test(q) && qCode.length >= 2;

  const exams = await db.cbhpmCatalog.findMany({
    where: {
      active: true,
      ...(chapter ? { chapter } : {}),
      OR: isCodeQuery
        ? [
            { code: { startsWith: q } },
            { searchCode: { contains: qCode } },
            { searchName: { contains: qNorm } },
          ]
        : [{ searchName: { contains: qNorm } }],
    },
    select: {
      id: true,
      code: true,
      name: true,
      chapter: true,
      groupName: true,
    },
    orderBy: [{ chapter: "asc" }, { name: "asc" }],
    take: 20,
  });

  return NextResponse.json({ exams });
}
