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
        status: "pending",
      },
    });
  } catch (e) {
    console.error("[DAILY RECORDING LOG]", e);
  }
}

export async function markDailyRecordingReady(params: {
  dailyRoomName: string;
  recordingId: string;
  downloadUrl?: string;
  durationSecs?: number;
}): Promise<void> {
  try {
    const row = await db.dailyRecordingLog.findFirst({
      where: { dailyRoomName: params.dailyRoomName },
      orderBy: { createdAt: "desc" },
    });
    if (!row) {
      await db.dailyRecordingLog.create({
        data: {
          dailyRoomName: params.dailyRoomName,
          cloudRecording: true,
          recordingId: params.recordingId,
          downloadUrl: params.downloadUrl,
          durationSecs: params.durationSecs,
          status: "ready",
          readyAt: new Date(),
        },
      });
      return;
    }
    await db.dailyRecordingLog.update({
      where: { id: row.id },
      data: {
        recordingId: params.recordingId,
        downloadUrl: params.downloadUrl,
        durationSecs: params.durationSecs,
        status: "ready",
        readyAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[DAILY RECORDING READY]", e);
  }
}

export async function countDailyRecordingsSince(since: Date): Promise<number> {
  return db.dailyRecordingLog.count({
    where: { createdAt: { gte: since }, cloudRecording: true },
  });
}

export async function countDailyRecordingsReadySince(since: Date): Promise<number> {
  return db.dailyRecordingLog.count({
    where: { readyAt: { gte: since }, status: "ready" },
  });
}
