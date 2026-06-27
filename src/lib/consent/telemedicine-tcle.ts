import { db } from "@/lib/db";
import { ConsentType } from "@prisma/client";
import {
  TELEMEDICINE_TCLE_VERSION,
} from "@/lib/legal/tcle-telemedicine";

export { TELEMEDICINE_TCLE_VERSION };

export async function hasTelemedicineTcle(userId: string): Promise<boolean> {
  const row = await db.consent.findUnique({
    where: {
      userId_type_version: {
        userId,
        type: ConsentType.TELEMEDICINE_TCLE,
        version: TELEMEDICINE_TCLE_VERSION,
      },
    },
  });
  return !!row?.granted && !row.revokedAt;
}

export async function getTelemedicineTcleStatus(userId: string) {
  const row = await db.consent.findUnique({
    where: {
      userId_type_version: {
        userId,
        type: ConsentType.TELEMEDICINE_TCLE,
        version: TELEMEDICINE_TCLE_VERSION,
      },
    },
  });
  return {
    granted: !!row?.granted && !row?.revokedAt,
    version: TELEMEDICINE_TCLE_VERSION,
    grantedAt: row?.grantedAt?.toISOString() ?? null,
  };
}

export async function recordTelemedicineTcle(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  campaignId?: string | null;
}): Promise<void> {
  const now = new Date();

  await db.consent.upsert({
    where: {
      userId_type_version: {
        userId: params.userId,
        type: ConsentType.TELEMEDICINE_TCLE,
        version: TELEMEDICINE_TCLE_VERSION,
      },
    },
    create: {
      userId: params.userId,
      type: ConsentType.TELEMEDICINE_TCLE,
      version: TELEMEDICINE_TCLE_VERSION,
      granted: true,
      grantedAt: now,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
    update: {
      granted: true,
      grantedAt: now,
      revokedAt: null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  if (params.campaignId) {
    await db.humanitarianIntake.updateMany({
      where: {
        campaignId: params.campaignId,
        patientUserId: params.userId,
      },
      data: {
        telemedicineTcleAt: now,
        telemedicineTcleVersion: TELEMEDICINE_TCLE_VERSION,
      },
    });
  }
}

export async function requireTelemedicineTcleForPatient(userId: string, role: string): Promise<boolean> {
  if (role !== "PATIENT") return true;
  return hasTelemedicineTcle(userId);
}
