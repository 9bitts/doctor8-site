import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createSignatureSession } from "@/lib/lacuna";
import { buildDigitalSignTestPdf } from "@/lib/digital-sign-test-pdf";
import { getPublicBase, buildSignReturnUrl, assertPublicSignBase, safeDecrypt } from "@/lib/sign-helpers";
import { parseLacunaError } from "@/lib/lacuna-errors";

export const runtime = "nodejs";
export const maxDuration = 60;

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
}

function safeReturnPath(returnTo: unknown): string {
  if (typeof returnTo !== "string") return "/professional/account";
  const path = returnTo.split("?")[0].split("#")[0];
  if (!path.startsWith("/professional/") && !path.startsWith("/psychologist/")) {
    return "/professional/account";
  }
  return path;
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  let returnTo = "/professional/account";
  try {
    const body = await req.json();
    returnTo = safeReturnPath(body?.returnTo);
  } catch { /* empty body ok */ }

  const pro = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
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

  const returnUrl = buildSignReturnUrl(base, "/api/professional/digital-sign/test/callback", {
    returnTo,
  });
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
    console.error("[DIGITAL SIGN TEST] erro:", e);
    const code = parseLacunaError(e);
    return NextResponse.json(
      { error: "Não foi possível iniciar o teste de assinatura. Verifique a configuração e tente novamente.", code },
      { status: 502 },
    );
  }
}
