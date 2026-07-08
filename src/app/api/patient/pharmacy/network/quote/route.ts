import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  resolvePrescriptionDrugIds,
  searchPharmacyQuotes,
  isPharmacyNetworkEnabled,
  countActivePharmacyStores,
  isPharmacyNetworkPublic,
} from "@/lib/pharmacy-network/quote";

const bodySchema = z.object({
  prescriptionId: z.string().optional(),
  drugCatalogIds: z.array(z.string()).optional(),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string().optional(),
        presentation: z.string().optional(),
      }),
    )
    .optional(),
  cep: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const networkEnabled = isPharmacyNetworkEnabled();
  const networkPublic = await isPharmacyNetworkPublic();
  const storeCount = await countActivePharmacyStores();

  let drugCatalogIds = parsed.data.drugCatalogIds ?? [];

  if (parsed.data.prescriptionId) {
    const rx = await db.prescription.findFirst({
      where: {
        id: parsed.data.prescriptionId,
        document: { patientId: ctx.patientProfileId },
      },
    });
    if (!rx) {
      return NextResponse.json({ error: "Prescrição não encontrada" }, { status: 404 });
    }
    const meds = (rx.medications as { name: string; dosage?: string }[]) || [];
    const resolved = await resolvePrescriptionDrugIds(
      meds.map((m) => ({ name: m.name, dosage: m.dosage })),
    );
    drugCatalogIds = resolved.map((r) => r.drugCatalogId);
  } else if (parsed.data.medications?.length) {
    const resolved = await resolvePrescriptionDrugIds(parsed.data.medications);
    drugCatalogIds = resolved.map((r) => r.drugCatalogId);
  }

  if (drugCatalogIds.length === 0) {
    return NextResponse.json({
      networkEnabled,
      storeCount,
      quotes: [],
      message: "Nenhum medicamento encontrado no catálogo Doctor8",
    });
  }

  if (!networkPublic) {
    return NextResponse.json({
      networkEnabled,
      networkPublic: false,
      storeCount,
      quotes: [],
      message: "A rede Doctor8 ainda não está disponível na sua região.",
    });
  }

  const quotes = await searchPharmacyQuotes({
    drugCatalogIds,
    cep: parsed.data.cep,
    city: parsed.data.city,
    state: parsed.data.state,
  });

  return NextResponse.json({
    networkEnabled,
    networkPublic,
    storeCount,
    requestedDrugs: drugCatalogIds.length,
    quotes,
  });
}
