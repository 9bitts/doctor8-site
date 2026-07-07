import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateWhistleblowerProtocol } from "@/lib/employer-nr1";

const schema = z.object({
  slug: z.string().min(2),
  category: z.string().min(2).max(80),
  description: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await db.employerCompany.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let protocolCode = generateWhistleblowerProtocol();
  for (let i = 0; i < 5; i++) {
    const clash = await db.employerWhistleblowerReport.findUnique({
      where: { protocolCode },
    });
    if (!clash) break;
    protocolCode = generateWhistleblowerProtocol();
  }

  await db.employerWhistleblowerReport.create({
    data: {
      employerCompanyId: company.id,
      protocolCode,
      category: parsed.data.category,
      description: parsed.data.description,
    },
  });

  return NextResponse.json({
    success: true,
    protocolCode,
    message: "Denúncia registrada. Guarde o protocolo para acompanhamento.",
  });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const company = await db.employerCompany.findUnique({
    where: { slug },
    select: { nomeFantasia: true, slug: true },
  });

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    companyName: company.nomeFantasia,
    categories: [
      { id: "assedio_moral", label: "Assédio moral" },
      { id: "assedio_sexual", label: "Assédio sexual" },
      { id: "discriminacao", label: "Discriminação" },
      { id: "sobrecarga", label: "Sobrecarga / condições de trabalho" },
      { id: "outro", label: "Outro" },
    ],
  });
}
