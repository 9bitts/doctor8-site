import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

const patchSchema = z.object({
  planTier: z.enum(["PILOT", "STARTER", "GROWTH", "ENTERPRISE"]).optional(),
  nr1ComplianceScore: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await db.employerCompany.update({
    where: { id },
    data: {
      planTier: parsed.data.planTier,
      nr1ComplianceScore: parsed.data.nr1ComplianceScore,
    },
    select: {
      id: true,
      nomeFantasia: true,
      planTier: true,
      nr1ComplianceScore: true,
    },
  });

  return NextResponse.json({ company });
}
