// src/lib/daily.ts
// Daily.co video call integration
// Rooms are created on demand, named after the appointment ID (deterministic).
// Private rooms + meeting tokens: only the patient and the professional can join.

import { dailyRoomBaseProperties } from "@/lib/data-residency";
import { logDailyRecording } from "@/lib/daily-recording-log";

const DAILY_API = "https://api.daily.co/v1";

function headers() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export interface DailyRoom {
  name: string;
  url: string;
}

// Creates the room for an appointment (or returns it if it already exists).
// nbf = 15 min before the appointment; exp = end + 60 min.
export async function getOrCreateRoom(
  appointmentId: string,
  scheduledAt: Date,
  durationMins: number
): Promise<DailyRoom> {
  const roomName = `doctor8-${appointmentId}`;

  const nbf = Math.floor(scheduledAt.getTime() / 1000) - 15 * 60;
  const exp =
    Math.floor(scheduledAt.getTime() / 1000) + (durationMins + 60) * 60;

  // Try to create
  const createRes = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: dailyRoomBaseProperties({
        nbf,
        exp,
        max_participants: 4,
      }),
    }),
  });

  if (createRes.ok) {
    const room = await createRes.json();
    await logDailyRecording({ dailyRoomName: room.name, appointmentId });
    return { name: room.name, url: room.url };
  }

  // Already exists? Fetch it.
  const getRes = await fetch(`${DAILY_API}/rooms/${roomName}`, {
    headers: headers(),
  });

  if (getRes.ok) {
    const room = await getRes.json();
    return { name: room.name, url: room.url };
  }

  const err = await createRes.text();
  console.error("[DAILY] Failed to create room:", err);
  throw new Error("Could not create video room");
}

// Creates a meeting token so only authorized users join the private room.
export async function createMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean,
  expUnix: number
): Promise<string> {
  if (process.env.E2E_MOCK_DAILY === "1") {
    return "e2e-mock-token";
  }

  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: expUnix,
      },
    }),
  });

  if (!res.ok) {
    console.error("[DAILY] Failed to create token:", await res.text());
    throw new Error("Could not create meeting token");
  }

  const data = await res.json();
  return data.token;
}

export type EphemeralRoomOptions = {
  maxParticipants?: number;
  durationSeconds?: number;
  enableKnocking?: boolean;
};

/** Creates a short-lived private room (JIT queue, humanitarian). Returns null if Daily is not configured. */
export async function createEphemeralRoom(
  options: EphemeralRoomOptions = {},
): Promise<DailyRoom | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return null;

  const {
    maxParticipants = 2,
    durationSeconds = 7200,
    enableKnocking = false,
  } = options;

  const exp = Math.floor(Date.now() / 1000) + durationSeconds;

  try {
    const res = await fetch(`${DAILY_API}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        privacy: "private",
        properties: dailyRoomBaseProperties({
          exp,
          max_participants: maxParticipants,
          enable_knocking: enableKnocking,
        }),
      }),
    });
    if (!res.ok) return null;
    const room = await res.json();
    await logDailyRecording({ dailyRoomName: room.name });
    return { name: room.name, url: room.url };
  } catch {
    return null;
  }
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return;
  try {
    await fetch(`${DAILY_API}/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    /* non-fatal */
  }
}

/** Fetch a time-limited download link for a cloud recording. */
export async function getDailyRecordingAccessLink(
  recordingId: string,
): Promise<{ downloadUrl: string; durationSecs?: number } | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key || !recordingId) return null;

  try {
    const res = await fetch(`${DAILY_API}/recordings/${recordingId}/access-link`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.error("[DAILY] recording access-link failed:", await res.text());
      return null;
    }
    const data = (await res.json()) as {
      download_link?: string;
      duration?: number;
    };
    if (!data.download_link) return null;
    return {
      downloadUrl: data.download_link,
      durationSecs: typeof data.duration === "number" ? data.duration : undefined,
    };
  } catch (e) {
    console.error("[DAILY] recording access-link error:", e);
    return null;
  }
}
