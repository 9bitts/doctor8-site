import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import {
  searchLaboratories,
  isLaboratoryNetworkEnabled,
  isLaboratoryNetworkPublic,
  countActiveLaboratories,
} from "@/lib/laboratory-network/quote";

const querySchema = z.object({
  labName: z.string().max(120).optional(),
  examQ: z.string().max(120).optional(),
  cep: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const networkEnabled = isLaboratoryNetworkEnabled();
  const networkPublic = await isLaboratoryNetworkPublic();
  const labCount = await countActiveLaboratories();

  const examNamesParam = req.nextUrl.searchParams.get("examNames");
  const examNames = examNamesParam
    ? examNamesParam.split("|").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const labName = parsed.data.labName?.trim();
  const examQ = parsed.data.examQ?.trim();

  if (!labName && !examQ && !examNames?.length && !parsed.data.cep && !parsed.data.city) {
    return NextResponse.json({
      networkEnabled,
      networkPublic,
      labCount,
      results: [],
      message: "Informe nome do laboratório, exame ou CEP/cidade.",
    });
  }

  if (!networkPublic) {
    return NextResponse.json({
      networkEnabled,
      networkPublic: false,
      labCount,
      results: [],
      message: "A rede de laboratórios Doctor8 ainda não está disponível na sua região.",
    });
  }

  const results = await searchLaboratories({
    labName,
    examQ,
    examNames,
    cep: parsed.data.cep?.replace(/\D/g, ""),
    city: parsed.data.city,
    state: parsed.data.state,
    limit: 25,
  });

  return NextResponse.json({
    networkEnabled,
    networkPublic,
    labCount,
    results,
    message: results.length === 0 ? "Nenhum laboratório encontrado com estes critérios." : null,
  });
}
