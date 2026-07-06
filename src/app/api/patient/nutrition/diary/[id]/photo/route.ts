import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/s3";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { nutritionDiaryFolder } from "@/lib/upload-folders";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const entry = await db.nutritionFoodDiaryEntry.findFirst({
    where: {
      id: params.id,
      patientUserId: ctx.userId,
      patientRecord: { linkedUserId: ctx.userId },
    },
  });
  if (!entry?.photoKey) {
    return NextResponse.json({ error: "No photo" }, { status: 404 });
  }

  const expectedPrefix = `${nutritionDiaryFolder(ctx.userId)}/`;
  if (!entry.photoKey.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await getSignedReadUrl(entry.photoKey, 900);
  return NextResponse.json({ url });
}
