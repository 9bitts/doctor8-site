import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getIntegrationStatuses } from "@/lib/integration-status";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    integrations: getIntegrationStatuses(),
  });
}
