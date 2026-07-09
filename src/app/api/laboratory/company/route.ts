import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLaboratory } from "@/lib/laboratory-auth";
import { db } from "@/lib/db";
import { geocodeAddress } from "@/lib/pharmacy-network/geocode";

export async function GET() {
  const ctx = await requireLaboratory();
  if ("error" in ctx) return ctx.error;

  const membership = await db.laboratoryMember.findFirst({
    where: { userId: ctx.userId, status: "ACTIVE" },
    include: { laboratory: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lab = membership.laboratory;
  const examCount = await db.laboratoryExamItem.count({
    where: { laboratoryId: lab.id, available: true },
  });

  return NextResponse.json({
    lab: {
      id: lab.id,
      cnpj: lab.cnpj,
      razaoSocial: lab.razaoSocial,
      nomeFantasia: lab.nomeFantasia,
      slug: lab.slug,
      labType: lab.labType,
      status: lab.status,
      contactEmail: lab.contactEmail,
      contactPhone: lab.contactPhone,
      responsibleFirstName: lab.responsibleFirstName,
      responsibleLastName: lab.responsibleLastName,
      addressStreet: lab.addressStreet,
      addressNumber: lab.addressNumber,
      addressComplement: lab.addressComplement,
      addressNeighborhood: lab.addressNeighborhood,
      addressCity: lab.addressCity,
      addressState: lab.addressState,
      addressZip: lab.addressZip,
      platformFeeCents: lab.platformFeeCents,
    },
    memberRole: membership.role,
    examCount,
  });
}

const patchSchema = z.object({
  nomeFantasia: z.string().min(2).max(120).optional(),
  labType: z.enum(["BLOOD", "IMAGING", "BOTH"]).optional(),
  contactPhone: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireLaboratory(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const lab = await db.laboratory.update({
    where: { id: ctx.laboratoryId },
    data: {
      ...(data.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia } : {}),
      ...(data.labType !== undefined ? { labType: data.labType } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
      ...(data.addressStreet !== undefined ? { addressStreet: data.addressStreet } : {}),
      ...(data.addressNumber !== undefined ? { addressNumber: data.addressNumber } : {}),
      ...(data.addressComplement !== undefined ? { addressComplement: data.addressComplement } : {}),
      ...(data.addressNeighborhood !== undefined ? { addressNeighborhood: data.addressNeighborhood } : {}),
      ...(data.addressCity !== undefined ? { addressCity: data.addressCity } : {}),
      ...(data.addressState !== undefined ? { addressState: data.addressState } : {}),
      ...(data.addressZip !== undefined ? { addressZip: data.addressZip?.replace(/\D/g, "") } : {}),
    },
  });

  const geo = await geocodeAddress({
    street: lab.addressStreet,
    number: lab.addressNumber,
    neighborhood: lab.addressNeighborhood,
    city: lab.addressCity,
    state: lab.addressState,
    zip: lab.addressZip,
  });
  if (geo) {
    await db.laboratory.update({
      where: { id: lab.id },
      data: { latitude: geo.latitude, longitude: geo.longitude },
    });
  }

  const updated = await db.laboratory.findUnique({ where: { id: lab.id } });
  return NextResponse.json({ lab: updated ?? lab });
}
