import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { nutritionDiaryFolder } from "@/lib/upload-folders";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; entryId: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const entry = await db.nutritionFoodDiaryEntry.findFirst({
    where: { id: params.entryId, patientRecordId: params.id },
  });
  if (!entry?.photoKey) {
    return NextResponse.json({ error: "No photo" }, { status: 404 });
  }

  const url = await getSignedReadUrl(entry.photoKey, 900);
  return NextResponse.json({ url });
}
