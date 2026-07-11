import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychoanalyst, safeDecrypt } from "@/lib/psychoanalyst-api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const record = await db.analysandRecord.findUnique({
    where: { id: params.id },
  });

  if (!record || record.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: record.id,
    firstName: safeDecrypt(record.firstName),
    lastName: safeDecrypt(record.lastName),
    email: record.email,
    phone: record.phone ? safeDecrypt(record.phone) : null,
    sessionFrequency: record.sessionFrequency,
    processStartDate: record.processStartDate?.toISOString() ?? null,
    hasAccount: !!record.linkedUserId,
    notes: record.notes ? safeDecrypt(record.notes) : null,
  });
}
