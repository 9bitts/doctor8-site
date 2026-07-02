import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { revokeSmartClientAccess } from "@/lib/fhir/smart-token-maintenance";
import { getSmartClientName } from "@/lib/fhir/smart-oauth-clients";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const now = new Date();
  const tokens = await db.smartAccessToken.findMany({
    where: { userId: ctx.userId, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      scope: true,
      patientId: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const apps = await Promise.all(
    tokens.map(async (t) => ({
      ...t,
      clientName: (await getSmartClientName(t.clientId)) || t.clientId,
    })),
  );

  return NextResponse.json({ apps });
}

export async function DELETE(req: Request) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await db.smartAccessToken.findFirst({
    where: { id, userId: ctx.userId },
    select: { clientId: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await revokeSmartClientAccess(ctx.userId, row.clientId);
  return NextResponse.json({ success: true });
}
