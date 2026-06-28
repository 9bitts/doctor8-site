import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const action = sp.get("action")?.trim() || "";
  const resource = sp.get("resource")?.trim() || "";
  const userId = sp.get("userId")?.trim() || "";

  const where = {
    ...(action ? { action: action as AuditAction } : {}),
    ...(resource ? { resource: { contains: resource, mode: "insensitive" as const } } : {}),
    ...(userId ? { userId } : {}),
  };

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
      userId: r.userId,
      userEmail: r.user?.email ?? null,
      userRole: r.user?.role ?? null,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      details: r.details,
    })),
  });
}
