import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getAdminOverviewStats } from "@/lib/admin/admin-overview";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const stats = await getAdminOverviewStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/admin/overview]", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
