import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  getAdminEightSsoPayload,
  type EightSsoStatus,
} from "@/lib/admin/admin-sso-users";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || undefined;
  const role = sp.get("role")?.trim() || undefined;
  const ssoStatus = sp.get("ssoStatus")?.trim() as EightSsoStatus | undefined;
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const take = Math.min(100, Math.max(1, Number(sp.get("take") || "50")));

  try {
    const payload = await getAdminEightSsoPayload({ q, role, ssoStatus, page, take });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/admin/sso/eight]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
