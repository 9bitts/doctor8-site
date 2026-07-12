import { createEphemeralRoom } from "@/lib/daily";

const E2E_MOCK_ROOM = {
  url: "https://doctor8.daily.co/e2e-hum-room",
  name: "e2e-hum-room",
} as const;

export async function createHumanitarianDailyRoom(): Promise<{ url: string; name: string }> {
  if (process.env.E2E_MOCK_DAILY === "1") {
    return { ...E2E_MOCK_ROOM };
  }
  const room = await createEphemeralRoom({ maxParticipants: 2 });
  return room ?? { url: "", name: "" };
}
