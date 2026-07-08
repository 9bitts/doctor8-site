import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { EmployerMemberRole, EmployerMemberStatus } from "@prisma/client";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "SST", "HR", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await db.employerMember.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Cannot modify owner" }, { status: 400 });
  }

  if (member.userId === ctx.userId && parsed.data.status === "DISABLED") {
    return NextResponse.json({ error: "Cannot disable yourself" }, { status: 400 });
  }

  const updated = await db.employerMember.update({
    where: { id: member.id },
    data: {
      role: parsed.data.role as EmployerMemberRole | undefined,
      status: parsed.data.status as EmployerMemberStatus | undefined,
    },
    include: {
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    member: {
      id: updated.id,
      email: updated.user.email,
      role: updated.role,
      status: updated.status,
    },
  });
}
