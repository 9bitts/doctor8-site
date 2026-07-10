import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { listAdminOccupationalPhysicians } from "@/lib/admin/admin-users-search";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const physicians = await listAdminOccupationalPhysicians();
    return NextResponse.json({ physicians });
  } catch (error) {
    console.error("[GET /api/admin/occupational-physicians]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
