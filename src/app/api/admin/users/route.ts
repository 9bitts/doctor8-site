import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { searchAdminUsers } from "@/lib/admin/admin-users-search";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const users = await searchAdminUsers(q);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
