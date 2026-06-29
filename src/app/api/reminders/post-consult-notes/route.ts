import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyQStashSignature } from "@/lib/qstash";
import { logQStashJob } from "@/lib/integration-logs";
import { processPostConsultNotesReminder } from "@/lib/post-consult-notes";

const schema = z.object({
  appointmentId: z.string(),
  remindersEpoch: z.number().int().nonnegative().optional(),
});

/** QStash callback ? remind provider to record post-consultation notes. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!(await verifyQStashSignature(req, rawBody))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { appointmentId, remindersEpoch } = parsed.data;

  if (remindersEpoch !== undefined) {
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: { remindersEpoch: true },
    });
    if (!appt) {
      await logQStashJob({
        appointmentId,
        jobType: "post_consult_notes",
        status: "skipped",
        detail: "not found",
      });
      return NextResponse.json({ skipped: true, reason: "not found" });
    }
    if (appt.remindersEpoch !== remindersEpoch) {
      await logQStashJob({
        appointmentId,
        jobType: "post_consult_notes",
        status: "skipped",
        detail: "stale epoch",
      });
      return NextResponse.json({ skipped: true, reason: "stale epoch" });
    }
  }

  const result = await processPostConsultNotesReminder(appointmentId);

  await logQStashJob({
    appointmentId,
    jobType: "post_consult_notes",
    status: result === "failed" ? "failed" : result === "sent" ? "sent" : "skipped",
  });

  if (result === "failed") {
    return NextResponse.json({ error: "Notification failed" }, { status: 500 });
  }

  return NextResponse.json({ success: result === "sent", skipped: result === "skipped" });
}
