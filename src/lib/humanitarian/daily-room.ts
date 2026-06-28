import { createEphemeralRoom } from "@/lib/daily";

export async function createHumanitarianDailyRoom(): Promise<{ url: string; name: string }> {
  const room = await createEphemeralRoom({ maxParticipants: 2 });
  return room ?? { url: "", name: "" };
}
