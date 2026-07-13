import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  getDefaultQueueAlertMinutes,
  loadUnlinkedIntakeDetail,
} from "@/lib/admin/patient-monitoring";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ protocolo: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { protocolo } = await params;
  const sp = new URL(req.url).searchParams;
  const queueAlertRaw = sp.get("queueAlertMinutes");
  const queueAlertMinutes = queueAlertRaw
    ? parseInt(queueAlertRaw, 10)
    : getDefaultQueueAlertMinutes();

  const result = await loadUnlinkedIntakeDetail(protocolo, queueAlertMinutes);
  if (!result) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 });
  }

  if (result.kind === "redirect") {
    return NextResponse.json({
      redirectTo: `/admin/patients/${result.profileId}`,
    });
  }

  return NextResponse.json({
    intake: result.detail,
    fetchedAt: new Date().toISOString(),
  });
}
