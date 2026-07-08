import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildGroCriteriaDocument } from "@/lib/nr1-gro-criteria";
import { db } from "@/lib/db";

export async function POST() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: {
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      grauRisco: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = buildGroCriteriaDocument(company);

  const version =
    (await db.employerNr1Document.count({
      where: { employerCompanyId: ctx.employerCompanyId, docType: "GRO_CRITERIA" },
    })) + 1;

  await db.employerNr1Document.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      docType: "GRO_CRITERIA",
      version,
      title: `Critérios GRO — v${version}`,
      contentJson: payload,
    },
  });

  return NextResponse.json({ export: payload });
}
