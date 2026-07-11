// src/lib/encryption.ts
// AES-256-GCM encryption for PHI fields — HIPAA requirement
// All fields marked @encrypted in schema.prisma must use these functions

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";


function getKey(): Buffer {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string. Generate with: openssl rand -hex 32");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/** AES-256-GCM payloads stored as iv:authTag:ciphertext (hex segments). */
export function looksLikeEncryptedPayload(text: string): boolean {
  if (!text || !text.includes(":")) return false;
  const parts = text.split(":");
  if (parts.length < 3) return false;
  const [iv, authTag, ...rest] = parts;
  const payload = rest.join(":");
  if (iv.length < 24 || authTag.length < 24 || payload.length < 16) return false;
  return (
    /^[0-9a-f]+$/i.test(iv) &&
    /^[0-9a-f]+$/i.test(authTag) &&
    /^[0-9a-f]+$/i.test(payload)
  );
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(":")) return ciphertext;

  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
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
