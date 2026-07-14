import { NextRequest, NextResponse } from "next/server";
import { requireLibraryAuth } from "@/lib/professional-library";
import { searchColleagues } from "@/lib/professional-library/colleague-share";

export async function GET(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const colleagues = await searchColleagues(ctx.userId, q);

  return NextResponse.json({
    colleagues,
    professionals: colleagues
      .filter((c) => c.kind === "health")
      .map((c) => ({ id: c.id, name: c.name, specialty: c.specialty, email: c.email })),
  });
}
