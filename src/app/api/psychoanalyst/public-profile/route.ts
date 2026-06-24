// GET/PATCH ? public listing settings for the logged-in psychoanalyst.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptPsychoanalystNameFields } from "@/lib/psychoanalyst-api";
import {
  buildPublicProfileUrl,
  getPublicListingStatus,
  ensureVirtualCard,
} from "@/lib/public-profile";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PSYCHOANALYST")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.psychoanalystProfile.findUnique({
    where: { userId: session.user.id },
    include: { virtualCard: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const decrypted = decryptPsychoanalystNameFields(profile);

  let card = profile.virtualCard;
  if (!card) {
    await ensureVirtualCard({
      psychoanalystId: profile.id,
      firstName: decrypted.firstName,
      lastName: decrypted.lastName,
      specialty: PSYCHOANALYSIS_SPECIALTY,
      clinicCity: profile.clinicCity,
    });
    card = await db.virtualCard.findUnique({ where: { psychoanalystId: profile.id } });
  }
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 500 });

  const status = getPublicListingStatus(profile.verified, card.isPublic);

  return NextResponse.json({
    slug: card.slug,
    isPublic: card.isPublic,
    publicUrl: status === "live" ? buildPublicProfileUrl(card) : null,
    shortUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app"}/dr/${card.slug}`,
    status,
    verified: profile.verified,
    specialtySlug: card.specialtySlug,
    citySlug: card.citySlug,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PSYCHOANALYST")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const isPublic = Boolean(body.isPublic);

  const profile = await db.psychoanalystProfile.findUnique({
    where: { userId: session.user.id },
    include: { virtualCard: true },
  });
  if (!profile?.virtualCard)
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });

  if (isPublic && !profile.verified) {
    return NextResponse.json(
      { error: "Your profile must be approved by an admin before going public" },
      { status: 403 }
    );
  }

  const card = await db.virtualCard.update({
    where: { id: profile.virtualCard.id },
    data: { isPublic },
  });

  const status = getPublicListingStatus(profile.verified, card.isPublic);

  return NextResponse.json({
    isPublic: card.isPublic,
    status,
    publicUrl: status === "live" ? buildPublicProfileUrl(card) : null,
  });
}
