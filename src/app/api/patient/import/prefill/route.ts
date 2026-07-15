import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.patientProfile.findUnique({
    where: { id: ctx.patientProfileId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      cpf: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
    },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    shipName: `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim(),
    shipPhone: safeDecrypt(profile.phone) || "",
    shipCpf: safeDecrypt(profile.cpf) || "",
    shipLine1: safeDecrypt(profile.addressLine1) || "",
    shipLine2: safeDecrypt(profile.addressLine2) || "",
    shipCity: profile.city || "",
    shipState: (profile.state || "").slice(0, 2).toUpperCase(),
    shipZip: safeDecrypt(profile.zipCode) || "",
    shipCountry: profile.country || "BR",
  });
}
