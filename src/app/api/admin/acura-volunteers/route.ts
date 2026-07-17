import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  listAcuraVolunteersAdmin,
  setAcuraVolunteerStatus,
} from "@/lib/acura-volunteer-admin";

const patchSchema = z.object({
  kind: z.enum(["professional", "psychoanalyst", "integrative"]),
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "include", "revoke"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status") ?? "all";
  const status =
    statusParam === "PENDING" ||
    statusParam === "ACTIVE" ||
    statusParam === "REVOKED" ||
    statusParam === "NONE" ||
    statusParam === "all"
      ? statusParam
      : "all";
  const q = req.nextUrl.searchParams.get("q") ?? undefined;

  const stats = await listAcuraVolunteersAdmin({ status, q, limit: 200 });
  return NextResponse.json(stats);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await setAcuraVolunteerStatus({
      kind: parsed.data.kind,
      id: parsed.data.id,
      action: parsed.data.action,
      adminUserId: session.user.id,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await audit.updateRecord(session.user.id, "AcuraVolunteer", row.id);

    return NextResponse.json({ volunteer: row });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
