import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROVIDER_TYPE_ENUM, type ProviderType } from "@/lib/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("providerType") || "health";
  if (!(PROVIDER_TYPE_ENUM as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "Invalid providerType" }, { status: 400 });
  }
  const providerType = raw as ProviderType;

  if (providerType === "psychoanalyst") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { id: params.id, verified: true },
      include: {
        healthPlans: { include: { healthPlan: true }, orderBy: { healthPlan: { sortOrder: "asc" } } },
      },
    });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      plans: profile.healthPlans.map((hp) => ({
        slug: hp.healthPlan.slug,
        name: hp.healthPlan.name,
      })),
    });
  }

  if (providerType === "integrative") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { id: params.id, verified: true },
      include: {
        healthPlans: { include: { healthPlan: true }, orderBy: { healthPlan: { sortOrder: "asc" } } },
      },
    });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      plans: profile.healthPlans.map((hp) => ({
        slug: hp.healthPlan.slug,
        name: hp.healthPlan.name,
      })),
    });
  }

  const profile = await db.professionalProfile.findUnique({
    where: { id: params.id, verified: true },
    include: {
      healthPlans: { include: { healthPlan: true }, orderBy: { healthPlan: { sortOrder: "asc" } } },
    },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    plans: profile.healthPlans.map((hp) => ({
      slug: hp.healthPlan.slug,
      name: hp.healthPlan.name,
    })),
  });
}
