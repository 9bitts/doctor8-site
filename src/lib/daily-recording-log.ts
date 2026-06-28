import { db } from "@/lib/db";
import { isDailyCloudRecordingEnabled } from "@/lib/data-residency";

export async function logDailyRecording(params: {
  dailyRoomName: string;
  appointmentId?: string;
  humanitarianEntryId?: string;
}): Promise<void> {
  if (!isDailyCloudRecordingEnabled() || !params.dailyRoomName) return;
  try {
    await db.dailyRecordingLog.create({
      data: {
        dailyRoomName: params.dailyRoomName,
        appointmentId: params.appointmentId,
        humanitarianEntryId: params.humanitarianEntryId,
        cloudRecording: true,
      },
    });
  } catch (e) {
    console.error("[DAILY RECORDING LOG]", e);
  }
}

export async function countDailyRecordingsSince(since: Date): Promise<number> {
  return db.dailyRecordingLog.count({
    where: { createdAt: { gte: since }, cloudRecording: true },
  });
}
