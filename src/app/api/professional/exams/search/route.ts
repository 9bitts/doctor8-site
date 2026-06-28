// GET — search CISMIV lab exams for exam requests (professional only).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchCismivLabExams } from "@/lib/cismiv-lab-exams";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ exams: [] });
  }

  const names = searchCismivLabExams(q, 20);
  return NextResponse.json({
    exams: names.map((name) => ({ id: name, code: "", name })),
  });
}
