import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadVolunteerScheduledAttentionItems } from "@/lib/admin/volunteer-scheduled-attention";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await loadVolunteerScheduledAttentionItems();
  return NextResponse.json({ items });
}
