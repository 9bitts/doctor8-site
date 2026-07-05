import { NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import { loadVolunteerScheduledAttentionItems } from "@/lib/admin/volunteer-scheduled-attention";

export async function GET() {
  const session = await getPatientAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await loadVolunteerScheduledAttentionItems();
  return NextResponse.json({ items });
}
