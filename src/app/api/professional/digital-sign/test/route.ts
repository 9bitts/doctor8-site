import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSignatureSession } from "@/lib/lacuna";
import { buildDigitalSignTestPdf } from "@/lib/digital-sign-test-pdf";
import { getPublicBase, buildSignReturnUrl, assertPublicSignBase, safeDecrypt } from "@/lib/sign-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pro = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true, digitalSignCpf: true },
  });
  if (!pro?.digitalSignCpf) {
    return NextResponse.json(
      { error: "Configure seu CPF de assinatura antes de testar." },
      { status: 400 },
    );
  }

  const cpf = safeDecrypt(pro.digitalSignCpf);
  const base = getPublicBase(req);
  const baseErr = assertPublicSignBase(base);
  if (baseErr) return NextResponse.json({ error: baseErr }, { status: 400 });

  const returnUrl = buildSignReturnUrl(base, "/api/professional/digital-sign/test/callback");
  const doctorName = `Dr. ${pro.firstName} ${pro.lastName}`.trim();
  const pdfBytes = await buildDigitalSignTestPdf({
    doctorName,
    cpfMasked: maskCpf(cpf),
    locale: "pt-BR",
  });

  try {
    const { redirectUrl } = await createSignatureSession({
      pdfBytes: Buffer.from(pdfBytes),
      fileName: "doctor8-teste-assinatura.pdf",
      returnUrl,
      cpf,
    });
    return NextResponse.json({ redirectUrl });
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao iniciar teste: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
