import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import {
  EMPLOYER_WEBHOOK_EVENTS,
  generateWebhookSecret,
} from "@/lib/employer-webhooks";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const endpoints = await db.employerWebhookEndpoint.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ endpoints, availableEvents: EMPLOYER_WEBHOOK_EVENTS });
}

const createSchema = z.object({
  url: z.string().url().max(500),
  label: z.string().max(100).optional(),
  events: z.array(z.enum(EMPLOYER_WEBHOOK_EVENTS)).min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const secret = generateWebhookSecret();
  const endpoint = await db.employerWebhookEndpoint.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      url: parsed.data.url,
      label: parsed.data.label,
      events: parsed.data.events,
      secret,
    },
  });

  return NextResponse.json({
    endpoint: {
      id: endpoint.id,
      label: endpoint.label,
      url: endpoint.url,
      events: endpoint.events,
      enabled: endpoint.enabled,
      createdAt: endpoint.createdAt.toISOString(),
    },
    secret,
  }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  url: z.string().url().max(500).optional(),
  label: z.string().max(100).optional(),
  events: z.array(z.enum(EMPLOYER_WEBHOOK_EVENTS)).optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerWebhookEndpoint.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const endpoint = await db.employerWebhookEndpoint.update({
    where: { id: existing.id },
    data: {
      enabled: parsed.data.enabled,
      url: parsed.data.url,
      label: parsed.data.label,
      events: parsed.data.events,
    },
    select: {
      id: true,
      label: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ endpoint });
}
