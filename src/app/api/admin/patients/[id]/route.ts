// ADMIN ONLY ? patient monitoring detail.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import {
  getDefaultQueueAlertMinutes,
  loadPatientDetail,
} from "@/lib/admin/patient-monitoring";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPatientAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const queueAlertRaw = sp.get("queueAlertMinutes");
  const queueAlertMinutes = queueAlertRaw
    ? parseInt(queueAlertRaw, 10)
    : getDefaultQueueAlertMinutes();

  const patient = await loadPatientDetail(params.id, queueAlertMinutes);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    patient,
    fetchedAt: new Date().toISOString(),
  });
}
