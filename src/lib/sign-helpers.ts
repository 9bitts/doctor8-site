// Shared helpers for Lacuna digital signing across prescriptions and clinical documents.

import { NextRequest } from "next/server";
import { decrypt } from "@/lib/encryption";

export type SignLang = "en" | "pt" | "es";

export function getPublicBase(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (req.headers.get("x-forwarded-host")
      ? `https://${req.headers.get("x-forwarded-host")}`
      : req.headers.get("host")
        ? `https://${req.headers.get("host")}`
        : req.nextUrl.origin)
  ).replace(/\/+$/, "");
}

export function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return String(v); }
}

export function normLang(v: string | null | undefined): SignLang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

export const LOCALE: Record<SignLang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export function computeAge(dob: Date | null): number | null {
  if (!dob || isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

export function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

export interface ResolvedPatient {
  name: string;
  dob: Date | null;
  cpf: string;
  addressFull: string;
}

type PatientFields = {
  firstName: string; lastName: string; dateOfBirth?: string | null;
  cpf?: string | null; addressLine1?: string | null;
  city?: string | null; state?: string | null; country?: string | null; zipCode?: string | null;
};

export function resolvePatient(
  record: PatientFields | null | undefined,
  profile: PatientFields | null | undefined
): ResolvedPatient {
  const src = record || profile;
  if (!src) {
    return { name: "—", dob: null, cpf: "", addressFull: "" };
  }
  const name = `${safeDecrypt(src.firstName)} ${safeDecrypt(src.lastName)}`.trim();
  const dob = src.dateOfBirth ? new Date(safeDecrypt(src.dateOfBirth)) : null;
  return {
    name,
    dob,
    cpf: safeDecrypt(src.cpf ?? null),
    addressFull: joinAddress([
      safeDecrypt(src.addressLine1),
      src.city, src.state, safeDecrypt(src.zipCode), src.country,
    ]),
  };
}

export interface ExamContent {
  items: string[];
  notes?: string;
  cid?: string;
}

export function parseExamContent(raw: string | null): ExamContent {
  if (!raw) return { items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items.filter((i: unknown) => typeof i === "string" && i.trim()),
        notes: parsed.notes || "",
        cid: parsed.cid || "",
      };
    }
  } catch { /* plain text fallback */ }
  return {
    items: raw.split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

export function serializeExamContent(data: ExamContent): string {
  return JSON.stringify({
    items: data.items,
    notes: data.notes || "",
    cid: data.cid || "",
  });
}

export function isExamType(type: string): boolean {
  return type === "EXAM_REQUEST" || type === "EXAM_RESULT";
}
