import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

/** Default public link lifetime (hours). */
export const SHARED_LINK_DEFAULT_EXPIRES_HOURS = 72;
/** Maximum allowed expiry when patient chooses duration (hours). */
export const SHARED_LINK_MAX_EXPIRES_HOURS = 168;
/** Auto-revoke after this many successful views. */
export const SHARED_LINK_DEFAULT_MAX_VIEWS = 50;
export const SHARED_LINK_MAX_VIEWS_CAP = 100;

export function resolvePublicShareExpiresAt(expiresInHours: number): Date {
  const hours =
    expiresInHours > 0
      ? Math.min(expiresInHours, SHARED_LINK_MAX_EXPIRES_HOURS)
      : SHARED_LINK_DEFAULT_EXPIRES_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function resolvePublicShareMaxViews(maxViews?: number): number {
  if (maxViews == null || maxViews <= 0) return SHARED_LINK_DEFAULT_MAX_VIEWS;
  return Math.min(maxViews, SHARED_LINK_MAX_VIEWS_CAP);
}

export async function hashShareViewPin(pin: string): Promise<string> {
  return bcrypt.hash(pin.trim(), 12);
}

export async function verifyShareViewPin(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return true;
  if (!pin.trim()) return false;
  return bcrypt.compare(pin.trim(), hash);
}

export type PublicShareRecord = {
  id: string;
  isPublicLink: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  viewCount: number;
  maxViews: number;
  viewPinHash: string | null;
  createdAt: Date;
};

export type PublicShareAccessResult =
  | { ok: true }
  | { ok: false; status: number; error: string; requiresPin?: boolean };

export function checkPublicShareAccess(
  shared: PublicShareRecord,
  pin?: string | null,
): PublicShareAccessResult {
  if (!shared.isPublicLink) {
    return { ok: false, status: 404, error: "Link not found or has been revoked." };
  }

  if (shared.revokedAt) {
    return { ok: false, status: 410, error: "This link has been revoked." };
  }

  const now = new Date();
  if (shared.expiresAt && shared.expiresAt < now) {
    return { ok: false, status: 410, error: "This link has expired." };
  }

  if (!shared.expiresAt) {
    const fallbackExpiry = new Date(
      shared.createdAt.getTime() + SHARED_LINK_DEFAULT_EXPIRES_HOURS * 60 * 60 * 1000,
    );
    if (fallbackExpiry < now) {
      return { ok: false, status: 410, error: "This link has expired." };
    }
  }

  if (shared.viewCount >= shared.maxViews) {
    return { ok: false, status: 410, error: "This link has reached its view limit." };
  }

  if (shared.viewPinHash) {
    if (!pin?.trim()) {
      return { ok: false, status: 401, error: "PIN required.", requiresPin: true };
    }
  }

  return { ok: true };
}

export async function verifyPublicSharePin(
  shared: PublicShareRecord,
  pin?: string | null,
): Promise<PublicShareAccessResult> {
  const base = checkPublicShareAccess(shared, pin);
  if (!base.ok) return base;

  if (shared.viewPinHash) {
    const valid = await verifyShareViewPin(pin ?? "", shared.viewPinHash);
    if (!valid) {
      return { ok: false, status: 403, error: "Invalid PIN." };
    }
  }

  return { ok: true };
}

export async function auditAnonymousShareView(
  sharedRecordId: string,
  ipAddress: string,
  userAgent: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await createAuditLog({
    action: AuditAction.VIEW_RECORD,
    resource: "SharedRecord",
    resourceId: sharedRecordId,
    details: {
      anonymous: true,
      ipAddress,
      userAgent: userAgent.substring(0, 500),
      ...details,
    },
  });
}
