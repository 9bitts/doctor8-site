import { encrypt, decrypt } from "@/lib/encryption";
import type {
  IdentificationData,
  SpecialtyData,
} from "@/lib/humanitarian/anamnese";
import type { HumanitarianTriageData } from "@/lib/humanitarian/triage";

const ENCRYPTED_FIELD_PATTERN = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

export function safeDecryptField(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

function encryptStringField(value: string | undefined | null): string | undefined {
  if (value == null || value === "") return value ?? undefined;
  if (ENCRYPTED_FIELD_PATTERN.test(value)) return value;
  return encrypt(value);
}

function encryptStringFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly (keyof T)[],
): T {
  const out = { ...obj };
  for (const field of fields) {
    const value = out[field];
    if (typeof value === "string") {
      (out as Record<string, unknown>)[field as string] = encryptStringField(value);
    }
  }
  return out;
}

function decryptStringFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly (keyof T)[],
): T {
  const out = { ...obj };
  for (const field of fields) {
    const value = out[field];
    if (typeof value === "string") {
      (out as Record<string, unknown>)[field as string] = safeDecryptField(value);
    }
  }
  return out;
}

const IDENTIFICATION_STRING_FIELDS = [
  "fullName",
  "ageOrDob",
  "phone",
  "phoneDdi",
  "phoneDdd",
  "phoneNumber",
  "email",
  "state",
  "municipality",
  "householdSize",
] as const satisfies readonly (keyof IdentificationData)[];

function encryptDeepStrings(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (ENCRYPTED_FIELD_PATTERN.test(value)) return value;
    return encrypt(value);
  }
  if (Array.isArray(value)) return value.map(encryptDeepStrings);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === "string" || Array.isArray(nested) || (nested && typeof nested === "object")) {
        out[key] = encryptDeepStrings(nested);
      } else {
        out[key] = nested;
      }
    }
    return out;
  }
  return value;
}

function decryptDeepStrings(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return safeDecryptField(value);
  if (Array.isArray(value)) return value.map(decryptDeepStrings);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = decryptDeepStrings(nested);
    }
    return out;
  }
  return value;
}

export function encryptIdentificationData(data: IdentificationData): IdentificationData {
  return encryptStringFields(data, IDENTIFICATION_STRING_FIELDS);
}

export function decryptIdentificationData(
  data: IdentificationData | null | undefined,
): IdentificationData | null {
  if (!data) return null;
  return decryptStringFields(data, IDENTIFICATION_STRING_FIELDS);
}

export function encryptSpecialtyData(data: SpecialtyData): SpecialtyData {
  return encryptDeepStrings(data) as SpecialtyData;
}

export function decryptSpecialtyData(
  data: SpecialtyData | null | undefined,
): SpecialtyData | null {
  if (!data) return null;
  return decryptDeepStrings(data) as SpecialtyData;
}

export function encryptTriageData(data: HumanitarianTriageData): HumanitarianTriageData {
  const out = { ...data };
  if (out.headTraumaDescription) {
    out.headTraumaDescription = encryptStringField(out.headTraumaDescription);
  }
  return out;
}

export function decryptTriageData(
  data: HumanitarianTriageData | null | undefined,
): HumanitarianTriageData | null {
  if (!data) return null;
  const out = { ...data };
  if (out.headTraumaDescription) {
    out.headTraumaDescription = safeDecryptField(out.headTraumaDescription);
  }
  return out;
}

export function encryptAdditionalNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  return encryptStringField(notes) ?? null;
}

export function decryptAdditionalNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  return safeDecryptField(notes) || null;
}

export type HumanitarianIntakePhiFields = {
  triageData?: unknown;
  identificationData?: unknown;
  specialtyData?: unknown;
  additionalNotes?: string | null;
};

export function decryptHumanitarianIntakeFields<T extends HumanitarianIntakePhiFields>(
  intake: T,
): T {
  return {
    ...intake,
    triageData: intake.triageData
      ? decryptTriageData(intake.triageData as HumanitarianTriageData)
      : intake.triageData,
    identificationData: intake.identificationData
      ? decryptIdentificationData(intake.identificationData as IdentificationData)
      : intake.identificationData,
    specialtyData: intake.specialtyData
      ? decryptSpecialtyData(intake.specialtyData as SpecialtyData)
      : intake.specialtyData,
    additionalNotes: decryptAdditionalNotes(intake.additionalNotes),
  };
}

export function encryptHumanitarianIntakePatch(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...fields };
  if (out.triageData) {
    out.triageData = encryptTriageData(out.triageData as HumanitarianTriageData);
  }
  if (out.identificationData) {
    out.identificationData = encryptIdentificationData(out.identificationData as IdentificationData);
  }
  if (out.specialtyData) {
    out.specialtyData = encryptSpecialtyData(out.specialtyData as SpecialtyData);
  }
  if (out.additionalNotes !== undefined) {
    out.additionalNotes = encryptAdditionalNotes(out.additionalNotes as string | null);
  }
  return out;
}
