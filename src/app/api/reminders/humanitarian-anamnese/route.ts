import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyHumanitarianAnamneseReminder } from "@/lib/humanitarian/notify";
import { logQStashJob } from "@/lib/integration-logs";
import { verifyQStashSignature } from "@/lib/qstash";
import { z } from "zod";

const schema = z.object({
  patientUserId: z.string(),
  campaignSlug: z.string(),
  intakeId: z.string(),
});

/** QStash callback ? nudge patient to complete optional anamnese while in queue. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!(await verifyQStashSignature(req, rawBody))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const intake = await db.humanitarianIntake.findUnique({
    where: { id: payload.intakeId },
    select: { status: true, patientUserId: true },
  });

  if (!intake || intake.patientUserId !== payload.patientUserId) {
    await logQStashJob({
      jobType: "humanitarian_anamnese",
      status: "skipped",
      detail: "intake not found",
    });
    return NextResponse.json({ skipped: true });
  }

  if (intake.status === "COMPLETE") {
    await logQStashJob({
      jobType: "humanitarian_anamnese",
      status: "skipped",
      detail: "anamnese already complete",
    });
    return NextResponse.json({ skipped: true, reason: "complete" });
  }

  const activeEntry = await db.humanitarianQueueEntry.findFirst({
    where: {
      patientUserId: payload.patientUserId,
      status: { in: ["WAITING", "CALLED"] },
    },
  });

  if (!activeEntry) {
    await logQStashJob({
      jobType: "humanitarian_anamnese",
      status: "skipped",
      detail: "not in queue",
    });
    return NextResponse.json({ skipped: true, reason: "not_waiting" });
  }

  await notifyHumanitarianAnamneseReminder({
    patientUserId: payload.patientUserId,
    campaignSlug: payload.campaignSlug,
  });

  await logQStashJob({
    jobType: "humanitarian_anamnese",
    status: "sent",
    detail: payload.intakeId,
  });

  return NextResponse.json({ sent: true });
}
