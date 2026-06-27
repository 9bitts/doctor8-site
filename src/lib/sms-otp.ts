// OTP helpers for SMS account verification.

import { randomInt } from "crypto";

export const SMS_OTP_PREFIX = "sms:";
export const SMS_OTP_TTL_MS = 10 * 60 * 1000;
export const SMS_RESEND_COOLDOWN_MS = 60 * 1000;

export function smsOtpIdentifier(email: string): string {
  return `${SMS_OTP_PREFIX}${email.toLowerCase()}`;
}

export function generateSmsCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function isSmsOtpIdentifier(identifier: string): boolean {
  return identifier.startsWith(SMS_OTP_PREFIX);
}

export function emailFromSmsIdentifier(identifier: string): string {
  return identifier.slice(SMS_OTP_PREFIX.length);
}
