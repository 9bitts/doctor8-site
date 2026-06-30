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
import {
  buildSupportSystemPrompt,
  prepareSupportMessages,
  type SupportChatMessage,
} from "@/lib/support-prompt";
import {
  normalizeSupportRole,
  type SupportContext,
} from "@/lib/support-context";
import { auth } from "@/lib/auth";
import { getSupportPlatformCapabilities } from "@/lib/support-platform-capabilities";

const ERROR_MSG: Record<string, Record<string, string>> = {
  pt: {
    unavailable: "O suporte está temporariamente indisponível. Tente novamente em instantes.",
    generic: "Algo deu errado. Tente novamente.",
    invalid: "Requisição inválida.",
  },
  en: {
    unavailable: "Support is temporarily unavailable. Please try again shortly.",
    generic: "Something went wrong. Please try again.",
    invalid: "Invalid request.",
  },
  es: {
    unavailable: "El soporte no está disponible temporalmente. Inténtalo de nuevo en un momento.",
    generic: "Algo salió mal. Inténtalo de nuevo.",
    invalid: "Solicitud inválida.",
  },
};

function resolveLang(lang: unknown): "pt" | "en" | "es" {
  if (typeof lang === "string" && lang.startsWith("pt")) return "pt";
  if (typeof lang === "string" && lang.startsWith("es")) return "es";
  return "en";
}

const ALLOWED_ROLES = new Set([
  "PATIENT",
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
  "ORGANIZATION",
  "ADMIN",
]);

function parseContext(body: Record<string, unknown>, sessionRole: string | null): SupportContext {
  const ctx = body.context;
  const raw = ctx && typeof ctx === "object" ? (ctx as Record<string, unknown>) : {};
  const pathname = typeof raw.pathname === "string" ? raw.pathname.slice(0, 256) : "/";

  const safeRole =
    sessionRole && ALLOWED_ROLES.has(sessionRole) ? sessionRole : null;
  const isLoggedIn = !!safeRole;
  const role = normalizeSupportRole(safeRole, pathname);

  return { pathname, role, isLoggedIn };
}

function sanitizeMessages(raw: unknown): SupportChatMessage[] | null {
  if (!Array.isArray(raw)) return null;

  const out: SupportChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const msg = item as Record<string, unknown>;
    const role = msg.role;
    const content = msg.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed.slice(0, 4000) });
  }

  return out.length > 0 ? out : null;
}

export async function POST(req: NextRequest) {
  const langKey = resolveLang(undefined);

  try {
    const ip = clientIp(req);
    const rate = await checkRateLimit({
      namespace: "support:ip",
      key: ip,
      ...RATE_LIMITS.supportIp,
    });
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const body = await req.json();
    const lang = resolveLang(body.lang);
    const err = ERROR_MSG[lang];

    const messages = sanitizeMessages(body.messages);
    if (!messages) {
      return NextResponse.json({ error: err.invalid }, { status: 400 });
    }

    const session = await auth();
    const sessionRole = session?.user?.role ?? null;

    const context = parseContext(body, sessionRole);
    const apiMessages = prepareSupportMessages(messages);
    if (apiMessages.length === 0) {
      return NextResponse.json({ error: err.invalid }, { status: 400 });
    }

    const capabilities = getSupportPlatformCapabilities();
    const systemPrompt = buildSupportSystemPrompt(lang, context, capabilities);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      console.error("[SUPPORT API ERROR]", await response.text());
      return NextResponse.json({ error: err.unavailable }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: err.generic }, { status: 500 });
    }

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("[SUPPORT ERROR]", error);
    return NextResponse.json(
      { error: ERROR_MSG[langKey].generic },
      { status: 500 },
    );
  }
}
