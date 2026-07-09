import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export const ANAMNESIS_DEFAULT_MAX_VIEWS = 30;

export type AnamnesisInviteAccess = {
  id: string;
  status: string;
  expiresAt: Date;
  viewCount: number;
  maxViews: number;
};

export type AnamnesisAccessResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function checkAnamnesisInviteAccess(invite: AnamnesisInviteAccess): AnamnesisAccessResult {
  if (invite.status === "COMPLETED") {
    return { ok: false, status: 409, error: "Already submitted" };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false, status: 410, error: "Link expired" };
  }
  if (invite.viewCount >= invite.maxViews) {
    return { ok: false, status: 410, error: "This link has reached its view limit." };
  }
  return { ok: true };
}

export async function auditAnamnesisInviteView(
  inviteId: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await createAuditLog({
    action: AuditAction.VIEW_RECORD,
    resource: "PsychologyAnamnesisInvite",
    resourceId: inviteId,
    details: { anonymous: true, ipAddress, userAgent: userAgent.substring(0, 500) },
  });
}
