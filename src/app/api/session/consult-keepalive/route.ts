import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { verifyActiveConsult, type ConsultKind } from "@/lib/consult-session";

const bodySchema = z.object({
  kind: z.enum(["appointment", "jit", "humanitarian"]),
  id: z.string().min(1),
});

/** Extends session during active teleconsult (called from video room every ~4 min). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { kind, id } = parsed.data;
  const active = await verifyActiveConsult(
    session.user.id,
    kind as ConsultKind,
    id,
  );
  if (!active) {
    return NextResponse.json({ error: "Consult not active" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, extendSeconds: consultMaxAge() });
}

function consultMaxAge(): number {
  return parseInt(process.env.SESSION_CONSULT_MAX_AGE_SECONDS || "7200", 10);
}
