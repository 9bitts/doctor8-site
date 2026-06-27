import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listCampaignIntakes } from "@/lib/humanitarian/intake";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const intakes = await listCampaignIntakes(slug);
  return NextResponse.json({ intakes });
}
