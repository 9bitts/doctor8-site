import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getLaboratoryExamPrices,
  isLaboratoryNetworkPublic,
} from "@/lib/laboratory-network/quote";

type RouteParams = { params: Promise<{ id: string }> };

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const networkPublic = await isLaboratoryNetworkPublic();
  if (!networkPublic) {
    return NextResponse.json({ error: "Rede indisponível" }, { status: 403 });
  }

  const { id } = await params;
  const lab = await db.laboratory.findFirst({
    where: { id, status: "ACTIVE" },
    select: {
      id: true,
      nomeFantasia: true,
      labType: true,
      addressStreet: true,
      addressNumber: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      contactPhone: true,
    },
  });

  if (!lab) {
    return NextResponse.json({ error: "Laboratório não encontrado" }, { status: 404 });
  }

  const examQ = req.nextUrl.searchParams.get("examQ")?.trim() || undefined;
  const examNamesParam = req.nextUrl.searchParams.get("examNames");
  const examNames = examNamesParam
    ? examNamesParam.split("|").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const exams = await getLaboratoryExamPrices(id, examQ, examNames);

  return NextResponse.json({
    lab,
    exams: exams.map((e) => ({
      ...e,
      priceFormatted: formatCents(e.priceCents),
    })),
  });
}
