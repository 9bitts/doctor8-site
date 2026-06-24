// GET — search Brazilian CID-10 codes by code or description (for clinical records).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const qNorm = normalize(q);
  const qCode = normalizeCode(q);
  const isCodeQuery = /^[A-Za-z]/.test(q) && qCode.length >= 2;

  const rows = await db.cid10Catalog.findMany({
    where: {
      active: true,
      OR: isCodeQuery
        ? [
            { code: { startsWith: q.toUpperCase() } },
            { searchCode: { contains: qCode } },
            { searchDescription: { contains: qNorm } },
          ]
        : [{ searchDescription: { contains: qNorm } }],
    },
    select: {
      code: true,
      description: true,
    },
    orderBy: [{ code: "asc" }],
    take: 15,
  });

  return NextResponse.json({
    results: rows.map((r) => ({ code: r.code, description: r.description })),
  });
}
