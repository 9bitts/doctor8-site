import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPendingLegalAcceptance } from "@/lib/consent/legal-acceptance";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await getPendingLegalAcceptance(session.user.id);
  return NextResponse.json(pending);
}
