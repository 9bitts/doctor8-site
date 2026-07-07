import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { requirePatient, isApiError } from "@/lib/api-auth";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

const submitSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const form = await db.pharmacyIntakeForm.findFirst({
    where: {
      id: params.id,
      patientRecord: { linkedUserId: ctx.userId },
    },
    include: {
      professional: { select: { firstName: true, lastName: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: form.id,
    status: form.status,
    responses: form.responses,
    sentAt: form.sentAt.toISOString(),
    completedAt: form.completedAt?.toISOString() ?? null,
    professionalName: `${safeDecrypt(form.professional.firstName)} ${safeDecrypt(form.professional.lastName)}`.trim(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const form = await db.pharmacyIntakeForm.findFirst({
    where: {
      id: params.id,
      status: "PENDING",
      patientRecord: { linkedUserId: ctx.userId },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body.responses ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.pharmacyIntakeForm.update({
    where: { id: form.id },
    data: {
      status: "COMPLETED",
      responses: parsed.data as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt?.toISOString(),
  });
}
