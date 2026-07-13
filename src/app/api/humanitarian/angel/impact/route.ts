import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAngelImpactStats } from "@/lib/humanitarian/angel-impact";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const stats = await getAngelImpactStats(session.user.id);
  if (!stats) {
    return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(stats);
}
