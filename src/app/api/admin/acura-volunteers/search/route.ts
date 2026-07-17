import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchProvidersForAcuraInclude } from "@/lib/acura-volunteer-admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchProvidersForAcuraInclude(q, 25);
  return NextResponse.json({ results });
}
