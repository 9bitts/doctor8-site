import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

function randomId(): string {
  return randomBytes(16).toString("hex");
}

const createSchema = z.object({
  campaignSlug: z.string().optional(),
  track: z.enum([
    "ESCUTA", "CAMPO", "ENTREGAS", "PROFISSIONAL", "INTERPRETE", "RETAGUARDA", "EDUCADOR", "EMBAIXADOR",
  ]),
  type: z.enum(["TURNO", "TAREFA"]),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  isRemote: z.boolean().optional(),
  location: z.string().max(500).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  requiresVehicle: z.boolean().optional(),
  requiredLanguages: z.array(z.string().max(20)).optional(),
  estimatedMinutes: z.number().int().min(15).max(24 * 60).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const missions = await db.angelMission.findMany({
    where: { campaignId: campaign.id },
    include: {
      signups: {
        include: {
          profile: { select: { firstName: true, lastName: true, userId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { signups: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    missions: missions.map((m) => ({
      id: m.id,
      track: m.track,
      type: m.type,
      title: m.title,
      description: m.description,
      isRemote: m.isRemote,
      location: m.location,
      startsAt: m.startsAt?.toISOString() ?? null,
      endsAt: m.endsAt?.toISOString() ?? null,
      capacity: m.capacity,
      requiresVehicle: m.requiresVehicle,
      requiredLanguages: m.requiredLanguages,
      estimatedMinutes: m.estimatedMinutes,
      status: m.status,
      confirmedCount: m._count.signups,
      signups: m.signups.map((s) => ({
        id: s.id,
        status: s.status,
        note: s.note,
        minutesCredited: s.minutesCredited,
        angelName: `${s.profile.firstName} ${s.profile.lastName}`.trim(),
        userId: s.profile.userId,
        createdAt: s.createdAt.toISOString(),
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.type === "TURNO" && !parsed.data.startsAt) {
    return NextResponse.json({ error: "startsAt required for TURNO" }, { status: 400 });
  }

  const slug = parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const mission = await db.angelMission.create({
    data: {
      id: randomId(),
      campaignId: campaign.id,
      track: parsed.data.track,
      type: parsed.data.type,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      isRemote: parsed.data.isRemote ?? false,
      location: parsed.data.location?.trim() || null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      capacity: parsed.data.capacity ?? 1,
      requiresVehicle: parsed.data.requiresVehicle ?? false,
      requiredLanguages: parsed.data.requiredLanguages ?? [],
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      status: "DRAFT",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ mission: { id: mission.id, status: mission.status } });
}
