import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import {
  searchPharmacyStores,
  isPharmacyNetworkEnabled,
  isPharmacyNetworkPublic,
  countActivePharmacyStores,
  type MedicationLine,
} from "@/lib/pharmacy-network/quote";

const querySchema = z.object({
  storeName: z.string().max(120).optional(),
  drugQ: z.string().max(120).optional(),
  cep: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
});

function parseMedications(raw: string | null): MedicationLine[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { name: string; dosage?: string; presentation?: string }[];
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter((m) => typeof m.name === "string" && m.name.trim())
      .map((m) => ({
        name: m.name,
        dosage: m.dosage,
        presentation: m.presentation ?? m.dosage,
      }));
  } catch {
    return undefined;
  }
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const networkEnabled = isPharmacyNetworkEnabled();
  const networkPublic = await isPharmacyNetworkPublic();
  const storeCount = await countActivePharmacyStores();
  const medications = parseMedications(req.nextUrl.searchParams.get("medications"));

  const storeName = parsed.data.storeName?.trim();
  const drugQ = parsed.data.drugQ?.trim();

  if (!storeName && !drugQ && !medications?.length && !parsed.data.cep && !parsed.data.city) {
    return NextResponse.json({
      networkEnabled,
      networkPublic,
      storeCount,
      results: [],
      message: "Informe nome da farmácia, medicamento ou CEP/cidade.",
    });
  }

  if (!networkPublic) {
    return NextResponse.json({
      networkEnabled,
      networkPublic: false,
      storeCount,
      results: [],
      message: "A rede Doctor8 ainda não está disponível na sua região.",
    });
  }

  const results = await searchPharmacyStores({
    storeName,
    drugQ,
    medications,
    cep: parsed.data.cep?.replace(/\D/g, ""),
    city: parsed.data.city,
    state: parsed.data.state,
    limit: 25,
  });

  return NextResponse.json({
    networkEnabled,
    networkPublic,
    storeCount,
    results: results.map((r) => ({
      ...r,
      subtotalFormatted: formatCents(r.subtotalCents),
    })),
    message: results.length === 0 ? "Nenhuma farmácia encontrada com estes critérios." : null,
  });
}
