import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  patientEndJitConsultation,
  professionalEndJitConsultation,
} from "@/lib/jit-queue-completion";

export const runtime = "nodejs";

const schema = z.object({ queueId: z.string() });

/** End an active JIT consult (patient leave or professional leave from video). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (session.user.role === "PATIENT") {
      await patientEndJitConsultation(parsed.data.queueId, session.user.id);
      return NextResponse.json({ success: true });
    }
    if (session.user.role === "PROFESSIONAL") {
      await professionalEndJitConsultation(parsed.data.queueId, session.user.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
