import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAcuraVolunteerStats } from "@/lib/acura-volunteer-stats";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getAcuraVolunteerStats(80);
  return NextResponse.json(stats);
}
