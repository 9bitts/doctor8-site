// src/app/api/admin/campaigns/[id]/duplicate/route.ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { duplicateCampaign } from "@/lib/admin/email-campaigns";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await duplicateCampaign(params.id, session.user.id!);
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[POST /api/admin/campaigns/[id]/duplicate]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
