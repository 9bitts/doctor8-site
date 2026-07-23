/** Client-safe provider booking types/helpers (no server-only imports). */

export type ProviderType = "health" | "psychoanalyst" | "integrative";

export const PROVIDER_TYPE_ENUM = ["health", "psychoanalyst", "integrative"] as const;

export function resolveBookingProviderId(input: {
  providerType: ProviderType;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
}): string | undefined {
  if (input.providerType === "psychoanalyst") {
    return input.psychoanalystId || input.professionalId || undefined;
  }
  if (input.providerType === "integrative") {
    return input.integrativeTherapistId || input.professionalId || undefined;
  }
  return input.professionalId || input.psychoanalystId || undefined;
}

export function bookingProviderIds(
  providerType: ProviderType,
  providerId: string,
): {
  professionalId?: string;
  psychoanalystId?: string;
  integrativeTherapistId?: string;
} {
  if (providerType === "psychoanalyst") return { psychoanalystId: providerId };
  if (providerType === "integrative") return { integrativeTherapistId: providerId };
  return { professionalId: providerId };
}

export function providerIdMetadataKey(
  providerType: ProviderType,
): "professionalId" | "psychoanalystId" | "integrativeTherapistId" {
  if (providerType === "psychoanalyst") return "psychoanalystId";
  if (providerType === "integrative") return "integrativeTherapistId";
  return "professionalId";
}

export function toPracticeProviderType(
  providerType: ProviderType,
): "health" | "psychoanalyst" | "integrative_therapist" {
  if (providerType === "integrative") return "integrative_therapist";
  return providerType;
}

export function appointmentProviderFilter(
  providerType: ProviderType,
  providerId: string,
): { professionalId: string } | { psychoanalystId: string } | { integrativeTherapistId: string } {
  if (providerType === "psychoanalyst") return { psychoanalystId: providerId };
  if (providerType === "integrative") return { integrativeTherapistId: providerId };
  return { professionalId: providerId };
}
