import { NextRequest, NextResponse } from "next/server";
import { logQStashJob } from "@/lib/integration-logs";
import {
  findPostConsultNotesCandidates,
  processPostConsultNotesReminder,
} from "@/lib/post-consult-notes";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Cron fallback ? notify providers about completed visits still missing notes. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ids = await findPostConsultNotesCandidates(80);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const appointmentId of ids) {
    const result = await processPostConsultNotesReminder(appointmentId);
    await logQStashJob({
      appointmentId,
      jobType: "post_consult_notes",
      status: result === "failed" ? "failed" : result === "sent" ? "sent" : "skipped",
      detail: "cron",
    });
    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
    else skipped += 1;
  }

  return NextResponse.json({
    ok: true,
    candidates: ids.length,
    sent,
    skipped,
    failed,
  });
}
