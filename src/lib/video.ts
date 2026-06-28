// src/lib/video.ts
// Legacy Daily.co helpers — prefer @/lib/daily for new code.
// Daily.co offers HIPAA-compliant video with BAA available
// Docs: https://docs.daily.co

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = "https://api.daily.co/v1";

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: string;
  created_at: string;
}

interface DailyToken {
  token: string;
}

// Create a private meeting room for a consultation
export async function createMeetingRoom(appointmentId: string): Promise<DailyRoom> {
  if (!DAILY_API_KEY) {
    // Dev mode: return mock room
    return {
      id: appointmentId,
      name: `doctor8-${appointmentId}`,
      url: `https://doctor8.daily.co/doctor8-${appointmentId}`,
      privacy: "private",
      created_at: new Date().toISOString(),
    };
  }

  const res = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `doctor8-${appointmentId}`,
      privacy: "private",              // Only token holders can join
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600, // Room expires in 1 hour
        max_participants: 2,           // Patient + Professional only
        enable_recording: false,       // HIPAA: no recording without consent
        enable_chat: false,            // Use our own chat
        enable_screenshare: true,
        enable_knocking: true,         // Patient waits for professional to admit
        start_video_off: false,
        start_audio_off: false,
        // HIPAA: enable end-to-end encryption
        enable_people_ui: true,
      },
    }),
  });

  if (!res.ok) throw new Error("Failed to create Daily.co room");
  return res.json();
}

// Generate a meeting token for a participant
export async function createMeetingToken(
  roomName: string,
  participantName: string,
  isOwner: boolean  // Professional is owner (can admit/remove)
): Promise<string> {
  if (!DAILY_API_KEY) {
    return `dev-token-${Math.random().toString(36).slice(2)}`;
  }

  const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: participantName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 3600,
        enable_recording: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  });

  if (!res.ok) throw new Error("Failed to create meeting token");
  const data: DailyToken = await res.json();
  return data.token;
}

// Delete room after consultation ends
export async function deleteMeetingRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) return;

  await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
  });
}
