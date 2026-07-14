import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchColleagues } from "@/lib/professional-library/colleague-share";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const colleagues = await searchColleagues(session.user.id, q);

  return NextResponse.json({
    colleagues,
    professionals: colleagues
      .filter((c) => c.kind === "health")
      .map((c) => ({ id: c.id, name: c.name, specialty: c.specialty, email: c.email })),
  });
}
