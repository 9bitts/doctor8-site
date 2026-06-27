export async function createHumanitarianDailyRoom(): Promise<{ url: string; name: string }> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return { url: "", name: "" };

  const exp = Math.floor(Date.now() / 1000) + 7200;

  try {
    const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        privacy: "private",
        properties: {
          exp,
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: true,
          enable_prejoin_ui: true,
          enable_knocking: false,
          eject_at_room_exp: true,
        },
      }),
    });
    const room = await dailyRes.json();
    return { url: room.url || "", name: room.name || "" };
  } catch {
    return { url: "", name: "" };
  }
}
