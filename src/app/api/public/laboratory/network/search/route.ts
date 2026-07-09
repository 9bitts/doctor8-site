import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  searchLaboratories,
  isLaboratoryNetworkPublic,
} from "@/lib/laboratory-network/quote";

const querySchema = z.object({
  labName: z.string().max(120).optional(),
  examQ: z.string().max(120).optional(),
  cep: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const networkPublic = await isLaboratoryNetworkPublic();
  const labName = parsed.data.labName?.trim();
  const examQ = parsed.data.examQ?.trim();

  if (!labName && !examQ && !parsed.data.cep && !parsed.data.city) {
    return NextResponse.json({
      networkPublic,
      results: [],
      message: "Informe nome do laboratório, exame ou CEP/cidade.",
    });
  }

  const results = await searchLaboratories({
    labName,
    examQ,
    cep: parsed.data.cep?.replace(/\D/g, ""),
    city: parsed.data.city,
    state: parsed.data.state,
    limit: 25,
  });

  return NextResponse.json({
    networkPublic,
    results,
    message: results.length === 0 ? "Nenhum laboratório encontrado." : null,
  });
}
