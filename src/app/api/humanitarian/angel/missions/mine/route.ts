import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMyMissionSignups } from "@/lib/humanitarian/angel-missions";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const signups = await listMyMissionSignups(session.user.id);
  return NextResponse.json({ signups });
}
