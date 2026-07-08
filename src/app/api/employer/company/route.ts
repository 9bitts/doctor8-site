import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  nomeFantasia: z.string().min(2).max(200).optional(),
  razaoSocial: z.string().min(2).max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional(),
  employeeCount: z.number().int().min(1).max(500000).optional(),
  grauRisco: z.number().int().min(1).max(4).optional(),
  companySize: z.enum(["MEI", "ME", "EPP", "MEDIUM", "LARGE"]).optional(),
  addressStreet: z.string().max(200).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(100).optional(),
  addressNeighborhood: z.string().max(100).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().max(12).optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      slug: true,
      contactEmail: true,
      contactPhone: true,
      logoUrl: true,
      companySize: true,
      employeeCount: true,
      grauRisco: true,
      addressStreet: true,
      addressNumber: true,
      addressComplement: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      planTier: true,
    },
  });

  return NextResponse.json({ company });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const company = await db.employerCompany.update({
    where: { id: ctx.employerCompanyId },
    data: {
      nomeFantasia: data.nomeFantasia,
      razaoSocial: data.razaoSocial,
      contactEmail: data.contactEmail === "" ? null : data.contactEmail,
      contactPhone: data.contactPhone,
      employeeCount: data.employeeCount,
      grauRisco: data.grauRisco,
      companySize: data.companySize,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement,
      addressNeighborhood: data.addressNeighborhood,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZip: data.addressZip,
    },
  });

  return NextResponse.json({ company });
}
