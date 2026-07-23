// Returns full profile of a single provider (health or psychoanalyst).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnifiedProvider, PROVIDER_TYPE_ENUM, type ProviderType } from "@/lib/providers";

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

  const provider = await getUnifiedProvider(params.id, providerType);
  if (!provider) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  return NextResponse.json({
    professional: {
      id: provider.id,
      providerType: provider.providerType,
      firstName: provider.firstName,
      lastName: provider.lastName,
      specialty: provider.specialty,
      bio: provider.bio,
      avatarUrl: provider.avatarUrl,
      consultPrice: provider.consultPrice,
      currency: provider.currency,
      acceptsTeleconsult: provider.acceptsTeleconsult,
      acceptsInPerson: provider.acceptsInPerson,
      clinicCity: provider.clinicCity,
      clinicCountry: provider.clinicCountry,
      license: provider.license ?? null,
      trainingInstitution: provider.trainingInstitution ?? null,
      yearsOfPractice: provider.yearsOfPractice ?? null,
    },
  });
}
