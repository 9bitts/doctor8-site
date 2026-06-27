import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";

export async function GET(
  _req: NextRequest,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lang = new URL(_req.url).searchParams.get("lang") || "es";

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: params.entryId },
    include: {
      intake: true,
      volunteer: {
        include: {
          professional: { select: { userId: true } },
          psychoanalyst: { select: { userId: true } },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = entry.patientUserId === session.user.id;
  const isVolunteer =
    entry.volunteer &&
    (entry.volunteer.professional?.userId === session.user.id ||
      entry.volunteer.psychoanalyst?.userId === session.user.id);
  const isAdmin = session.user.role === "ADMIN";

  if (!isPatient && !isVolunteer && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!entry.intake) {
    return NextResponse.json({
      summary: null,
      chiefComplaint: entry.chiefComplaint,
      message: "No intake on file",
    });
  }

  const summary = buildIntakeSummary(entry.intake, lang);

  return NextResponse.json({
    summary,
    chiefComplaint: entry.chiefComplaint,
    intakeStatus: entry.intake.status,
  });
}
