import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPharmacyPublicConfig } from "@/lib/pharmacy-marketplace";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getPharmacyPublicConfig());
}
