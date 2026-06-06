// src/lib/encryption.ts
// AES-256-GCM encryption for PHI fields — HIPAA requirement
// All fields marked @encrypted in schema.prisma must use these functions

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

if (process.env.NODE_ENV === "production" && KEY.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must be a 32-byte hex string. Generate with: openssl rand -hex 32"
  );
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(":")) return ciphertext;

  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Encrypt an object's PHI fields
export function encryptPatientFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      (result as Record<string, unknown>)[field as string] = encrypt(
        result[field] as string
      );
    }
  }
  return result;
}

// Decrypt an object's PHI fields
export function decryptPatientFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      (result as Record<string, unknown>)[field as string] = decrypt(
        result[field] as string
      );
    }
  }
  return result;
}

// PHI fields per model — single source of truth
export const PHI_FIELDS = {
  PatientProfile: [
    "firstName",
    "lastName",
    "dateOfBirth",
    "phone",
    "addressLine1",
    "addressLine2",
    "zipCode",
    "emergencyContactName",
    "emergencyContactPhone",
    "allergies",
    "chronicConditions",
    "notes",
  ],
  Medication: ["name", "dosage", "frequency", "notes"],
  Appointment: ["chiefComplaint", "notes"],
  MedicalDocument: ["title", "content", "fileUrl"],
  Message: ["content"],
  Prescription: ["instructions"],
} as const;
