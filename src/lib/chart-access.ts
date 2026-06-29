// Chart access for owners and colleague shares (Phase 7).

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import type { ChartSharePermission } from "@prisma/client";

export type ChartAccessLevel = "owner" | "edit" | "view";

export type ChartAccess = {
  level: ChartAccessLevel;
  recordId: string;
  ownerProfessionalId: string;
  shareId?: string;
};

export async function resolveChartAccess(
  professionalId: string,
  recordId: string,
): Promise<ChartAccess | null> {
  const record = await db.patientRecord.findUnique({
    where: { id: recordId },
    select: { id: true, professionalId: true },
  });
  if (!record) return null;

  if (record.professionalId === professionalId) {
    return { level: "owner", recordId: record.id, ownerProfessionalId: record.professionalId };
  }

  const direct = await db.patientRecordShare.findFirst({
    where: {
      patientRecordId: recordId,
      sharedWithProfessionalId: professionalId,
      revokedAt: null,
    },
    select: { id: true, permission: true },
  });
  if (direct) {
    return {
      level: direct.permission === "EDIT" ? "edit" : "view",
      recordId: record.id,
      ownerProfessionalId: record.professionalId,
      shareId: direct.id,
    };
  }

  const memberships = await db.clinicMember.findMany({
    where: { professionalId },
    select: { clinicId: true },
  });
  const clinicIds = memberships.map((m) => m.clinicId);
  if (clinicIds.length === 0) return null;

  const clinicShare = await db.patientRecordShare.findFirst({
    where: {
      patientRecordId: recordId,
      clinicId: { in: clinicIds },
      revokedAt: null,
    },
    select: { id: true, permission: true },
  });
  if (!clinicShare) return null;

  return {
    level: clinicShare.permission === "EDIT" ? "edit" : "view",
    recordId: record.id,
    ownerProfessionalId: record.professionalId,
    shareId: clinicShare.id,
  };
}

export function canEditChart(access: ChartAccess | null): boolean {
  return access?.level === "owner" || access?.level === "edit";
}

export async function getRecordWithAccess(
  professionalId: string,
  recordId: string,
  requireEdit = false,
  auditUserId?: string,
) {
  const access = await resolveChartAccess(professionalId, recordId);
  if (!access) return null;
  if (requireEdit && !canEditChart(access)) return null;
  const record = await db.patientRecord.findUnique({ where: { id: recordId } });
  if (!record) return null;
  if (auditUserId) {
    await auditChartView(auditUserId, recordId, access);
  }
  return { record, access };
}

export async function auditChartView(userId: string, recordId: string, access: ChartAccess) {
  await createAuditLog({
    userId,
    action: AuditAction.VIEW_RECORD,
    resource: "PatientRecord",
    resourceId: recordId,
    details: { accessLevel: access.level, shareId: access.shareId },
  });
}

export async function getClinicForProfessional(professionalId: string) {
  const membership = await db.clinicMember.findFirst({
    where: { professionalId },
    include: {
      clinic: {
        include: {
          members: {
            include: {
              professional: {
                select: { id: true, firstName: true, lastName: true, specialty: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });
  return membership;
}

export type ShareTarget =
  | { type: "colleague"; professionalId: string }
  | { type: "clinic"; clinicId: string };

export async function createChartShare(opts: {
  recordId: string;
  ownerProfessionalId: string;
  target: ShareTarget;
  permission: ChartSharePermission;
}): Promise<{ id: string } | { error: string }> {
  const record = await db.patientRecord.findFirst({
    where: { id: opts.recordId, professionalId: opts.ownerProfessionalId },
  });
  if (!record) return { error: "Chart not found" };

  if (opts.target.type === "colleague") {
    if (opts.target.professionalId === opts.ownerProfessionalId) {
      return { error: "Cannot share with yourself" };
    }
    const colleague = await db.professionalProfile.findUnique({
      where: { id: opts.target.professionalId },
    });
    if (!colleague) return { error: "Colleague not found" };

    const existing = await db.patientRecordShare.findFirst({
      where: {
        patientRecordId: opts.recordId,
        sharedWithProfessionalId: opts.target.professionalId,
        revokedAt: null,
      },
    });
    if (existing) {
      await db.patientRecordShare.update({
        where: { id: existing.id },
        data: { permission: opts.permission },
      });
      return { id: existing.id };
    }

    const share = await db.patientRecordShare.create({
      data: {
        patientRecordId: opts.recordId,
        sharedByProfessionalId: opts.ownerProfessionalId,
        sharedWithProfessionalId: opts.target.professionalId,
        permission: opts.permission,
      },
    });
    return { id: share.id };
  }

  const member = await db.clinicMember.findFirst({
    where: { clinicId: opts.target.clinicId, professionalId: opts.ownerProfessionalId },
  });
  if (!member) return { error: "You are not a member of this clinic" };

  const existing = await db.patientRecordShare.findFirst({
    where: {
      patientRecordId: opts.recordId,
      clinicId: opts.target.clinicId,
      revokedAt: null,
    },
  });
  if (existing) {
    await db.patientRecordShare.update({
      where: { id: existing.id },
      data: { permission: opts.permission },
    });
    return { id: existing.id };
  }

  const share = await db.patientRecordShare.create({
    data: {
      patientRecordId: opts.recordId,
      sharedByProfessionalId: opts.ownerProfessionalId,
      clinicId: opts.target.clinicId,
      permission: opts.permission,
    },
  });
  return { id: share.id };
}
