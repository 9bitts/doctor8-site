// POST ? keep-alive for active JIT plant?o while professional uses the dashboard.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { touchJitHeartbeat } from "@/lib/jit-session-lifecycle";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const active = await touchJitHeartbeat(professional.id);
  return NextResponse.json({ ok: true, active });
}
