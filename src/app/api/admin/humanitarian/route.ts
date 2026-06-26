import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { buildCampaignReport, seedVenezuelaCampaign } from "@/lib/humanitarian";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("slug");

  if (slug) {
    const campaign = await db.humanitarianCampaign.findUnique({ where: { slug } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const report = await buildCampaignReport(campaign.id);
    return NextResponse.json({ report });
  }

  const campaigns = await db.humanitarianCampaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  const reports = await Promise.all(
    campaigns.map(async (c) => buildCampaignReport(c.id)),
  );

  return NextResponse.json({ campaigns: reports.filter(Boolean) });
}

const patchSchema = z.object({
  slug: z.string(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await db.humanitarianCampaign.update({
    where: { slug: parsed.data.slug },
    data: {
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    },
  });

  const report = await buildCampaignReport(campaign.id);
  return NextResponse.json({ report });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action === "seed-venezuela") {
    const campaign = await seedVenezuelaCampaign();
    const report = campaign ? await buildCampaignReport(campaign.id) : null;
    return NextResponse.json({ campaign, report }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
