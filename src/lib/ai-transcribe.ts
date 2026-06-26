// Audio transcription via OpenAI Whisper (Phase 5 consult notes).

export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  lang?: "pt" | "en" | "es",
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("TRANSCRIBE_NOT_CONFIGURED");

  const ext = mimeType.includes("mp4") || mimeType.includes("m4a")
    ? "m4a"
    : mimeType.includes("mpeg") || mimeType.includes("mp3")
      ? "mp3"
      : mimeType.includes("wav")
        ? "wav"
        : "webm";

  const file = new File([new Uint8Array(audio)], `consult.${ext}`, { type: mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  if (lang === "pt") form.append("language", "pt");
  else if (lang === "es") form.append("language", "es");
  else if (lang === "en") form.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    console.error("[AI-TRANSCRIBE]", await response.text());
    throw new Error("TRANSCRIBE_FAILED");
  }

  const data = await response.json();
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) throw new Error("TRANSCRIBE_EMPTY");
  return text;
}

export function isTranscribeConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
