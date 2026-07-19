import { randomBytes, randomInt } from "crypto";
import { getAppUrl } from "@/lib/email-core";
import { hashShareViewPin, verifyShareViewPin } from "@/lib/shared-record-public";

export const EXAM_RESULT_REQUEST_DEFAULT_EXPIRES_DAYS = 7;
export const EXAM_RESULT_REQUEST_MAX_EXPIRES_DAYS = 30;
export const EXAM_RESULT_REQUEST_MAX_UPLOADS = 5;
export const EXAM_RESULT_REQUEST_MAX_VIEWS = 40;

export function generateExamResultRequestToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 6-digit numeric PIN shown once to the doctor. */
export function generateExamResultPin(): string {
  return String(randomInt(100000, 1000000));
}

export async function hashExamResultPin(pin: string): Promise<string> {
  return hashShareViewPin(pin);
}

export async function verifyExamResultPin(
  pin: string,
  hash: string | null | undefined,
): Promise<boolean> {
  return verifyShareViewPin(pin, hash);
}

export function examResultRequestPublicUrl(token: string): string {
  return `${getAppUrl()}/exame-resultado/${encodeURIComponent(token)}`;
}

export type ExamResultRequestAccessRecord = {
  status: string;
  expiresAt: Date;
  viewCount: number;
  maxViews: number;
  uploadCount: number;
  maxUploads: number;
};

export type ExamResultRequestAccessResult =
  | { ok: true; canSubmit: boolean }
  | { ok: false; status: number; error: string };

export function checkExamResultRequestAccess(
  req: ExamResultRequestAccessRecord,
): ExamResultRequestAccessResult {
  if (req.status === "REVOKED") {
    return { ok: false, status: 410, error: "This link has been revoked." };
  }

  const now = new Date();
  if (req.expiresAt < now || req.status === "EXPIRED") {
    return { ok: false, status: 410, error: "This link has expired." };
  }

  if (req.viewCount >= req.maxViews) {
    return { ok: false, status: 410, error: "This link has reached its view limit." };
  }

  const canSubmit = req.uploadCount < req.maxUploads;
  if (!canSubmit && req.status === "COMPLETED") {
    return { ok: false, status: 410, error: "Upload limit reached." };
  }

  return { ok: true, canSubmit };
}
