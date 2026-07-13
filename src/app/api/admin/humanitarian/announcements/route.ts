import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { publishAngelAnnouncement } from "@/lib/humanitarian/angel-coordination";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

const postSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(5000),
  track: z
    .enum([
      "ESCUTA",
      "CAMPO",
      "ENTREGAS",
      "PROFISSIONAL",
      "INTERPRETE",
      "RETAGUARDA",
      "EDUCADOR",
      "EMBAIXADOR",
    ])
    .optional()
    .nullable(),
  campaignSlug: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const announcements = await db.angelAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      track: true,
      publishedAt: true,
      createdAt: true,
      campaign: { select: { slug: true, name: true } },
    },
  });

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      track: a.track,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      campaignSlug: a.campaign?.slug ?? null,
      campaignName: a.campaign?.name ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await publishAngelAnnouncement({
    campaignSlug: parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG,
    track: parsed.data.track ?? null,
    title: parsed.data.title,
    body: parsed.data.body,
    createdById: session.user.id,
  });

  return NextResponse.json({ success: true, ...result });
}
