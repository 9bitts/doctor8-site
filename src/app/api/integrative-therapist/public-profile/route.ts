import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptIntegrativeNameFields, requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  buildPublicProfileUrl,
  getPublicListingStatus,
  ensureVirtualCard,
} from "@/lib/public-profile";
import { buildEmbedAgendaUrl } from "@/lib/public-slugs";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";

function parseGoogleBusinessUrl(raw: unknown): string | null | false {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.toString();
  } catch {
    return false;
  }
}

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
    include: { virtualCard: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const decrypted = decryptIntegrativeNameFields(profile);

  let card = profile.virtualCard;
  if (!card) {
    await ensureVirtualCard({
      integrativeTherapistId: profile.id,
      firstName: decrypted.firstName,
      lastName: decrypted.lastName,
      specialty: INTEGRATIVE_THERAPY_SPECIALTY,
      clinicCity: profile.clinicCity,
    });
    card = await db.virtualCard.findUnique({ where: { integrativeTherapistId: profile.id } });
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
    googleBusinessUrl: card.googleBusinessUrl,
    embedUrl: buildEmbedAgendaUrl(card.slug),
    analytics: null,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
    include: { virtualCard: true },
  });
  if (!profile?.virtualCard) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const updateData: { isPublic?: boolean; googleBusinessUrl?: string | null } = {};

  if (typeof body.isPublic === "boolean") {
    if (body.isPublic && !profile.verified) {
      return NextResponse.json(
        { error: "Your profile must be approved by an admin before going public" },
        { status: 403 },
      );
    }
    updateData.isPublic = body.isPublic;
  }

  if ("googleBusinessUrl" in body) {
    const parsed = parseGoogleBusinessUrl(body.googleBusinessUrl);
    if (parsed === false) {
      return NextResponse.json({ error: "Invalid Google Business URL" }, { status: 400 });
    }
    updateData.googleBusinessUrl = parsed;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const card = await db.virtualCard.update({
    where: { id: profile.virtualCard.id },
    data: updateData,
  });

  const status = getPublicListingStatus(profile.verified, card.isPublic);

  return NextResponse.json({
    isPublic: card.isPublic,
    status,
    publicUrl: status === "live" ? buildPublicProfileUrl(card) : null,
    googleBusinessUrl: card.googleBusinessUrl,
  });
}
