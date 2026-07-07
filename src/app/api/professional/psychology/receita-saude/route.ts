import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePsychologist, safeDecrypt } from "@/lib/psychology-api";
import { isPsychologyReceitaSaudeEnabled } from "@/lib/psychology-feature-flags";
import {
  buildHonorariumReceiptPdf,
} from "@/lib/psychology-chart-pdf";
import {
  formatReceitaSaudeDescription,
  buildReceitaSaudeChecklist,
} from "@/lib/psychology-receita-saude";
import type { SignLang } from "@/lib/sign-helpers";

const receiptSchema = z.object({
  patientRecordId: z.string(),
  patientCpf: z.string().min(11).max(14),
  amountBrl: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  city: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!isPsychologyReceitaSaudeEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;

  const lang = (req.nextUrl.searchParams.get("lang") || "pt") as SignLang;

  return NextResponse.json({
    checklist: buildReceitaSaudeChecklist(lang),
    serviceCode: "255",
    serviceLabel: lang === "en" ? "Psychologist" : lang === "es" ? "Psicólogo" : "Psicólogo",
  });
}

export async function POST(req: NextRequest) {
  if (!isPsychologyReceitaSaudeEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = receiptSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { db } = await import("@/lib/db");
  const record = await db.patientRecord.findUnique({ where: { id: parsed.data.patientRecordId } });
  if (!record || record.professionalId !== professional.id)
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const lang = (parsed.data.lang ?? "pt") as SignLang;
  const patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
  const description = parsed.data.description
    || formatReceitaSaudeDescription(parsed.data.serviceDate);

  const pdf = await buildHonorariumReceiptPdf({
    lang,
    psychologistName: `${professional.firstName} ${professional.lastName}`.trim(),
    crp: professional.licenseNumber,
    patientName,
    patientCpf: parsed.data.patientCpf.replace(/\D/g, ""),
    amountBrl: parsed.data.amountBrl,
    serviceDate: parsed.data.serviceDate,
    description,
    city: parsed.data.city,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-${parsed.data.serviceDate}.pdf"`,
    },
  });
}
