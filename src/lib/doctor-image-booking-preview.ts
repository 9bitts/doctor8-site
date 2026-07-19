// Booking preview (services + upcoming slots) for Doctor Image editor.

import {
  ensureDefaultServiceFromLegacyPrice,
  getProviderServices,
  type ProviderPracticeType,
  type ProviderServiceDto,
} from "@/lib/practice";
import {
  getProviderSlotPreview,
  type DaySlots,
  type SlotProviderType,
} from "@/lib/availability-slots";

export type DoctorImageBookingPreview = {
  services: ProviderServiceDto[];
  currency: string;
  consultPrice: number;
  days: DaySlots[];
};

function toSlotProviderType(practiceType: ProviderPracticeType): SlotProviderType {
  if (practiceType === "psychoanalyst") return "psychoanalyst";
  if (practiceType === "integrative_therapist") return "integrative";
  return "health";
}

export async function buildDoctorImageBookingPreview(params: {
  providerId: string;
  practiceType: ProviderPracticeType;
  consultPrice: number;
  currency: string;
  locale?: string;
}): Promise<DoctorImageBookingPreview> {
  const { providerId, practiceType, consultPrice, currency } = params;
  const locale = params.locale || "pt-BR";

  await ensureDefaultServiceFromLegacyPrice(providerId, practiceType, {
    consultPrice,
    currency,
  });

  const services = (await getProviderServices(providerId, practiceType, true)).filter(
    (s) => s.isActive
  );

  let days: DaySlots[] = [];
  try {
    days = await getProviderSlotPreview(
      providerId,
      toSlotProviderType(practiceType),
      locale,
      5
    );
  } catch {
    days = [];
  }

  return {
    services,
    currency: currency || "BRL",
    consultPrice: consultPrice || 0,
    days,
  };
}
