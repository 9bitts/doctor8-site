// src/app/api/professional/resources/[id]/route.ts
// DELETE — soft-delete a resource (sets active=false)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.professionalId !== professional.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.resource.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
