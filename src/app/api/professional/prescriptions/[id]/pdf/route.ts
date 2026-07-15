// src/app/api/professional/prescriptions/[id]/pdf/route.ts
// Serve o PDF da receita (assinado do S3 ou gerado na hora).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { servePrescriptionPdf } from "@/lib/serve-prescription-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  return servePrescriptionPdf(req, params.id, session);
}
