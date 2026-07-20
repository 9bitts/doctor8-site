import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email-core";
import {
  MARKETING_LEAD_INTERESTS,
  type MarketingLeadInterest,
} from "@/lib/marketing-hub-content";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@doctor8.org";
const INTEREST_VALUES = MARKETING_LEAD_INTERESTS.map((i) => i.value) as [
  MarketingLeadInterest,
  ...MarketingLeadInterest[],
];

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  interest: z.enum(INTEREST_VALUES),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

function interestLabel(value: MarketingLeadInterest): string {
  return MARKETING_LEAD_INTERESTS.find((i) => i.value === value)?.label ?? value;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "marketing-lead:ip",
    key: ip,
    ...RATE_LIMITS.marketingLeadIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Confira nome, e-mail e interesse." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const interest = interestLabel(data.interest);
  const subject = `[Doctor8 Marketing] ${interest} — ${data.name}`;
  const bodyLines = [
    `Lead capturado em /marketing`,
    `Nome: ${data.name}`,
    `E-mail: ${data.email}`,
    data.whatsapp ? `WhatsApp: ${data.whatsapp}` : null,
    data.company ? `Empresa: ${data.company}` : null,
    `Interesse: ${interest} (${data.interest})`,
    "",
    data.message ? `Mensagem:\n${data.message}` : "Sem mensagem adicional.",
  ].filter((line): line is string => line !== null);

  const ticketBody = bodyLines.join("\n");

  const ticket = await db.supportTicket.create({
    data: {
      subject: subject.slice(0, 200),
      body: ticketBody,
      contactEmail: data.email,
      source: "marketing_hub",
      priority:
        data.interest === "empresas" ||
        data.interest === "clinica" ||
        data.interest === "farmacias" ||
        data.interest === "laboratorios" ||
        data.interest === "distribuidores" ||
        data.interest === "parceiros"
          ? "high"
          : "normal",
    },
  });

  await sendTransactionalEmail({
    to: SUPPORT_EMAIL,
    subject,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${ticketBody.replace(/</g, "&lt;")}</pre>`,
    text: ticketBody,
    tag: "marketing_lead",
  }).catch((e) => console.error("[MARKETING-LEAD] email failed:", e));

  return NextResponse.json({
    ok: true,
    ticketId: ticket.id,
    message: "Recebemos seu interesse. Nossa equipe retorna em breve.",
  });
}
