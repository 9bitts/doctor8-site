import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revokeSmartClientAccess } from "@/lib/fhir/smart-token-maintenance";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const tokens = await db.smartAccessToken.findMany({
    where: { userId: session.user.id, expiresAt: { gt: now } },
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

  return NextResponse.json({ apps: tokens });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await db.smartAccessToken.findFirst({
    where: { id, userId: session.user.id },
    select: { clientId: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await revokeSmartClientAccess(session.user.id, row.clientId);
  return NextResponse.json({ success: true });
}
