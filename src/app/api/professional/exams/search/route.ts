// GET — search lab exam catalog for exam requests (professional only).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { searchCismivLabExams } from "@/lib/cismiv-lab-exams";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ exams: [] });
  }

  const names = searchCismivLabExams(q, 20);
  return NextResponse.json({
    exams: names.map((name) => ({ id: name, code: "", name })),
  });
}
