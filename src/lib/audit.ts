// src/lib/audit.ts
// HIPAA requires logging every access to PHI
// This function must be called whenever patient data is read, written, or deleted

import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { headers } from "next/headers";

interface AuditParams {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    const headersList = headers();
    const ipAddress = headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: ipAddress.split(",")[0].trim(), // first IP if behind proxy
        userAgent: userAgent.substring(0, 500),    // truncate long agents
        details: params.details as never,
      },
    });
  } catch (error) {
    // Audit log failures should NOT break the main request
    // but MUST be reported — HIPAA violation if logging fails silently
    console.error("[AUDIT LOG FAILURE]", error);
    // In production: send alert to security team
  }
}

// Convenience wrappers
export const audit = {
  viewRecord: (userId: string, resource: string, resourceId: string) =>
    createAuditLog({ userId, action: AuditAction.VIEW_RECORD, resource, resourceId }),

  createRecord: (userId: string, resource: string, resourceId: string) =>
    createAuditLog({ userId, action: AuditAction.CREATE_RECORD, resource, resourceId }),

  updateRecord: (userId: string, resource: string, resourceId: string) =>
    createAuditLog({ userId, action: AuditAction.UPDATE_RECORD, resource, resourceId }),

  deleteRecord: (userId: string, resource: string, resourceId: string) =>
    createAuditLog({ userId, action: AuditAction.DELETE_RECORD, resource, resourceId }),

  shareRecord: (userId: string, resourceId: string, details?: Record<string, unknown>) =>
    createAuditLog({ userId, action: AuditAction.SHARE_RECORD, resource: "MedicalDocument", resourceId, details }),

  exportData: (userId: string) =>
    createAuditLog({ userId, action: AuditAction.EXPORT_DATA, resource: "User" }),

  login: (userId: string) =>
    createAuditLog({ userId, action: AuditAction.LOGIN, resource: "Session" }),

  logout: (userId: string) =>
    createAuditLog({ userId, action: AuditAction.LOGOUT, resource: "Session" }),

  passwordChange: (userId: string) =>
    createAuditLog({ userId, action: AuditAction.PASSWORD_CHANGE, resource: "User" }),

  emailChange: (userId: string) =>
    createAuditLog({ userId, action: AuditAction.EMAIL_CHANGE, resource: "User" }),

  deletionRequest: (userId: string) =>
    createAuditLog({
      userId,
      action: AuditAction.DATA_DELETION_REQUEST,
      resource: "User",
      resourceId: userId,
    }),

  accountReactivated: (userId: string) =>
    createAuditLog({
      userId,
      action: AuditAction.UPDATE_RECORD,
      resource: "User",
      resourceId: userId,
      details: { event: "account_reactivated_on_login" },
    }),
};
