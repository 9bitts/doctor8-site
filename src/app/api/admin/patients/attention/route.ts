import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { loadVolunteerScheduledAttentionItems } from "@/lib/admin/volunteer-scheduled-attention";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await loadVolunteerScheduledAttentionItems();
  return NextResponse.json({ items });
}
