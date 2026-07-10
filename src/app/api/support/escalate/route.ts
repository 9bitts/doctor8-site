import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email-core";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@doctor8.org";
const SLA_HOURS = 24;

const bodySchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(8000),
  contactEmail: z.string().email().optional(),
});

/** Create support ticket + notify human team (escalation from AI widget). */
export async function POST(req: NextRequest) {
  const session = await auth();
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session?.user?.id ?? null;
  const contactEmail = parsed.data.contactEmail || session?.user?.email || null;
  const slaDueAt = new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000);

  const ticket = await db.supportTicket.create({
    data: {
      userId,
      subject: parsed.data.subject,
      body: parsed.data.body,
      contactEmail,
      source: "ai_escalation",
      slaDueAt,
    },
  });

  const emailBody = [
    `Ticket #${ticket.id}`,
    `Assunto: ${parsed.data.subject}`,
    userId ? `User ID: ${userId}` : "Usuário não autenticado",
    contactEmail ? `E-mail: ${contactEmail}` : "",
    `SLA: ${SLA_HOURS}h (até ${slaDueAt.toISOString()})`,
    "",
    parsed.data.body,
  ]
    .filter(Boolean)
    .join("\n");

  await sendTransactionalEmail({
    to: SUPPORT_EMAIL,
    subject: `[Doctor8 Suporte] ${parsed.data.subject}`,
    html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${emailBody.replace(/</g, "&lt;")}</pre>`,
    text: emailBody,
    tag: "support_escalation",
  }).catch((e) => console.error("[SUPPORT-TICKET] email failed:", e));

  return NextResponse.json({
    ok: true,
    ticketId: ticket.id,
    slaDueAt: slaDueAt.toISOString(),
    message: "Sua solicitação foi registrada. Nossa equipe responderá em até 24 horas úteis.",
  });
}
