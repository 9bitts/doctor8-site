import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  shareResourceWithColleague,
  type ColleagueKind,
} from "@/lib/professional-library/colleague-share";

const PROVIDER_ROLES = new Set([
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
]);

export async function handleShareProPost(
  req: NextRequest,
  resourceId: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!PROVIDER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = await shareResourceWithColleague(
    session.user.id,
    resourceId,
    {
      professionalId: body.professionalId,
      recipientKind: body.recipientKind as ColleagueKind | undefined,
      recipientId: body.recipientId,
      email: body.email,
      name: body.name,
      phone: body.phone,
    },
    (session.user as { language?: string }).language,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
