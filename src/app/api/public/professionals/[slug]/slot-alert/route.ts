import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getLivePublicProfileBySlug } from "@/lib/public-profile";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const data = {
    email,
    slug: params.slug,
    active: true,
    ...(profile.providerType === "health"
      ? { professionalId: profile.providerId }
      : { psychoanalystId: profile.providerId }),
  };

  const existing =
    profile.providerType === "health"
      ? await db.slotAvailabilityAlert.findUnique({
          where: {
            email_professionalId: { email, professionalId: profile.providerId },
          },
        })
      : await db.slotAvailabilityAlert.findUnique({
          where: {
            email_psychoanalystId: { email, psychoanalystId: profile.providerId },
          },
        });

  if (existing) {
    await db.slotAvailabilityAlert.update({
      where: { id: existing.id },
      data: { active: true, notifiedAt: null },
    });
  } else {
    await db.slotAvailabilityAlert.create({ data });
  }

  return NextResponse.json({ ok: true });
}
