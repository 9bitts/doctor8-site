import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isVideoReturnActiveForUser } from "@/lib/video-return-active";

export const runtime = "nodejs";

/** GET ?path=/video/jit/... — whether the return-to-call banner should still show. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const active = await isVideoReturnActiveForUser(path, session.user.id);
  return NextResponse.json({ active });
}
