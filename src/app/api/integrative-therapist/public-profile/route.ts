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
import {
  doctorImageFromCard,
  parsePublicProfilePatch,
} from "@/lib/public-profile-patch";
import { buildDoctorImageBookingPreview } from "@/lib/doctor-image-booking-preview";
import { localeOf, normalizeLang } from "@/lib/i18n/translations";

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
    include: { virtualCard: true, user: { select: { language: true } } },
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
  const locale = localeOf(normalizeLang(profile.user?.language));
  const bookingPreview = await buildDoctorImageBookingPreview({
    providerId: profile.id,
    practiceType: "integrative_therapist",
    consultPrice: profile.consultPrice,
    currency: profile.currency || "BRL",
    locale,
  });

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
    doctorImage: doctorImageFromCard(card),
    bookingPreview,
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

  const parsed = parsePublicProfilePatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.data.isPublic === true && !profile.verified) {
    return NextResponse.json(
      { error: "Your profile must be approved by an admin before going public" },
      { status: 403 },
    );
  }

  const card = await db.virtualCard.update({
    where: { id: profile.virtualCard.id },
    data: parsed.data,
  });

  const status = getPublicListingStatus(profile.verified, card.isPublic);

  return NextResponse.json({
    isPublic: card.isPublic,
    status,
    publicUrl: status === "live" ? buildPublicProfileUrl(card) : null,
    googleBusinessUrl: card.googleBusinessUrl,
    doctorImage: doctorImageFromCard(card),
  });
}
