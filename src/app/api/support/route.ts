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
import { z } from "zod";

const supportMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const supportRequestSchema = z.object({
  lang: z.string().optional(),
  messages: z.array(supportMessageSchema).min(1),
  context: z
    .object({
      pathname: z.string().max(256).optional(),
    })
    .optional(),
});

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

function parseContext(
  raw: z.infer<typeof supportRequestSchema>["context"],
  sessionRole: string | null,
): SupportContext {
  const pathname = raw?.pathname?.slice(0, 256) ?? "/";

  const safeRole =
    sessionRole && ALLOWED_ROLES.has(sessionRole) ? sessionRole : null;
  const isLoggedIn = !!safeRole;
  const role = normalizeSupportRole(safeRole, pathname);

  return { pathname, role, isLoggedIn };
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
    const parsed = supportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: ERROR_MSG[langKey].invalid }, { status: 400 });
    }

    const lang = resolveLang(parsed.data.lang);
    const err = ERROR_MSG[lang];

    const messages: SupportChatMessage[] = parsed.data.messages;

    const session = await auth();
    const sessionRole = session?.user?.role ?? null;

    const context = parseContext(parsed.data.context, sessionRole);
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
