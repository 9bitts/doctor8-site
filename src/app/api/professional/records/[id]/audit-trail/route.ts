import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";
import { requireProfessional } from "@/lib/psychology-api";

const PAGE_SIZE = 40;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const result = await getRecordWithAccess(professional.id, params.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.access.level !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));

  const docs = await db.medicalDocument.findMany({
    where: { patientRecordId: params.id },
    select: { id: true },
  });
  const resourceIds = [params.id, ...docs.map((d) => d.id)];

  const where = { resourceId: { in: resourceIds } };

  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true, role: true } },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    logs: rows.map((r) => ({
      id: r.id,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      userEmail: r.user?.email ?? null,
      userRole: r.user?.role ?? null,
      createdAt: r.createdAt.toISOString(),
      details: r.details,
      isSelf: r.userId === session.user.id,
    })),
  });
}
