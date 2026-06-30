// src/app/api/support/route.ts
// AI-powered support chat using Anthropic Claude
// Answers questions about Doctor8 — available to all users (logged in or not)

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { SUPPORT_SYSTEM_KNOWLEDGE } from "@/lib/support-knowledge";

const LANG_INSTRUCTION: Record<string, string> = {
  pt: "Responda sempre em português do Brasil.",
  en: "Always respond in English.",
  es: "Responde siempre en español.",
};

const SYSTEM_PROMPT_BASE = `You are the Doctor8 support assistant — friendly, precise, and focused on helping users navigate the platform.

${SUPPORT_SYSTEM_KNOWLEDGE}

FORMATTING RULES:
- Use Markdown for readability
- Put each numbered step on its own line (never multiple steps on one line)
- Use **bold** for menu names, buttons, and key actions
- Use short paragraphs and bullet or numbered lists for steps
- Keep answers concise and scannable`;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimit({
      namespace: "support:ip",
      key: ip,
      ...RATE_LIMITS.supportIp,
    });
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const { messages, lang } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const langKey = typeof lang === "string" && lang.startsWith("pt") ? "pt"
      : typeof lang === "string" && lang.startsWith("es") ? "es" : "en";
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${LANG_INSTRUCTION[langKey]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.slice(-6),
      }),
    });

    if (!response.ok) {
      console.error("[SUPPORT API ERROR]", await response.text());
      return NextResponse.json(
        { error: "Support is temporarily unavailable. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "I could not process your message. Please try again.";

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("[SUPPORT ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
