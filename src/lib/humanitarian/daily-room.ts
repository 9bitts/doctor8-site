export async function createHumanitarianDailyRoom(): Promise<{ url: string; name: string }> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return { url: "", name: "" };

  try {
    const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200,
          enable_chat: true,
          enable_knocking: false,
        },
      }),
    });
    const room = await dailyRes.json();
    return { url: room.url || "", name: room.name || "" };
  } catch {
    return { url: "", name: "" };
  }
}
