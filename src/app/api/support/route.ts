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

const SYSTEM_PROMPT = `You are the Doctor8 support assistant — friendly, precise, and focused on helping users navigate the platform.

${SUPPORT_SYSTEM_KNOWLEDGE}`;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimit({
      namespace: "support:ip",
      key: ip,
      ...RATE_LIMITS.supportIp,
    });
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

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
        system: SYSTEM_PROMPT,
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
