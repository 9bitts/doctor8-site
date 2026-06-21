// src/app/api/professional/prescriptions/sign/route.ts
// POST — assina digitalmente uma receita usando BirdID ou VIDaaS via CESS API.
// Fluxo:
//  1. Gera o PDF da receita em HTML → bytes (via html-pdf-node ou puppeteer-less)
//  2. Autentica no CESS com CPF + OTP do médico
//  3. Cria transação de assinatura PDFSignature
//  4. Faz upload do PDF
//  5. Aguarda assinatura (polling)
//  6. Baixa o PDF assinado
//  7. Salva no S3 e atualiza o campo digitalSignature da prescrição

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

const schema = z.object({
  prescriptionId: z.string(),
  otp:            z.string().min(4).max(8),
});

// CESS endpoints por provedor
const CESS_BASE = "https://cess.lab.vaultid.com.br"; // sandbox — trocar para prod depois

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

// Autentica no CESS e retorna token de sessão
async function cessAuthenticate(cpf: string, otp: string): Promise<string> {
  const schema = Buffer.from(`${cpf}:${otp}`).toString("base64");
  const res = await fetch(`${CESS_BASE}/signature-service`, {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${schema}`,
      "Content-Type":  "application/json",
      "Accept":        "application/json",
      "VCSchemaCfg":   "returnAccessToken=true;lifetime=300;autoRevoke=true",
    },
    body: JSON.stringify({
      certificate_alias:  "",
      type:               "PDFSignature",
      hash_algorithm:     "SHA256",
      auto_fix_document:  true,
      documents_source:   "UPLOAD_REFERENCE",
      signature_settings: [{
        id:                   "default",
        contact:              "",
        location:             "Brasil",
        reason:               "Assinatura médica — Doctor8",
        visible_signature:    true,
        visible_sign_x:       0,
        visible_sign_y:       750,
        visible_sign_width:   200,
        visible_sign_height:  40,
        visible_sign_page:    1,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CESS auth failed: ${err}`);
  }

  // Token vem no header VCSchemaData: accessToken;lifetime;provider
  const vcData   = res.headers.get("VCSchemaData") || "";
  const tcnData  = await res.json();
  const tcn      = tcnData.tcn as string;
  const token    = vcData.split(";")[0] || "";

  return `${tcn}|${token}`;
}

// Cria transação de assinatura e retorna TCN
async function cessCreateTransaction(token: string): Promise<string> {
  const res = await fetch(`${CESS_BASE}/signature-service`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Accept":        "application/json",
    },
    body: JSON.stringify({
      certificate_alias:  "",
      type:               "PDFSignature",
      hash_algorithm:     "SHA256",
      auto_fix_document:  true,
      documents_source:   "UPLOAD_REFERENCE",
      signature_settings: [{
        id:                   "default",
        contact:              "",
        location:             "Brasil",
        reason:               "Assinatura médica — Doctor8",
        visible_signature:    true,
        visible_sign_x:       0,
        visible_sign_y:       750,
        visible_sign_width:   200,
        visible_sign_height:  40,
        visible_sign_page:    1,
      }],
    }),
  });
  const data = await res.json();
  return data.tcn as string;
}

// Upload do PDF para o CESS
async function cessUploadPdf(tcn: string, token: string, pdfBytes: Buffer): Promise<void> {
  const form = new FormData();
  form.append("document", new Blob([pdfBytes], { type: "application/pdf" }), "receita.pdf");

  const res = await fetch(`${CESS_BASE}/file-transfer/${tcn}/eot/default`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body:    form,
  });
  if (!res.ok) throw new Error(`CESS upload failed: ${await res.text()}`);
}

// Aguarda assinatura (polling até 30s)
async function cessWaitSigned(tcn: string, token: string): Promise<string> {
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res  = await fetch(`${CESS_BASE}/signature-service/${tcn}`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    });
    const data = await res.json();
    const doc  = data.documents?.[0];
    if (doc?.status === "SIGNED") return doc.result as string;
    if (doc?.status === "ERROR")  throw new Error("CESS signing error");
  }
  throw new Error("CESS signing timeout");
}

// Baixa o PDF assinado do CESS
async function cessDownloadSigned(tcn: string, docId: string, token: string): Promise<Buffer> {
  const res = await fetch(`${CESS_BASE}/file-transfer/${tcn}/${docId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("CESS download failed");
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// Gera PDF a partir do HTML da receita (fetch interno)
async function generatePdfHtml(prescriptionId: string, token: string, appUrl: string): Promise<Buffer> {
  const res = await fetch(`${appUrl}/api/professional/prescriptions/${prescriptionId}/pdf`, {
    headers: { "Cookie": `next-auth.session-token=${token}` },
  });
  if (!res.ok) throw new Error("Failed to generate PDF HTML");
  const html = await res.text();
  // Return HTML as Buffer — CESS can handle HTML-based PDFs via auto_fix_document
  // In production, use puppeteer or html-pdf-node to convert to true PDF bytes
  return Buffer.from(html, "utf-8");
}

// Upload para S3
async function uploadSignedToS3(prescriptionId: string, pdfBytes: Buffer): Promise<string> {
  const s3 = new S3Client({
    region:      process.env.AWS_REGION || "eu-north-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const key = `prescriptions/signed/${prescriptionId}.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.AWS_S3_BUCKET!,
    Key:         key,
    Body:        pdfBytes,
    ContentType: "application/pdf",
  }));

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { prescriptionId, otp } = parsed.data;

  // 1. Verificar que a receita pertence ao profissional
  const professional = await db.professionalProfile.findUnique({
    where:  { userId: session.user.id },
    select: {
      id:                  true,
      digitalSignProvider: true,
      digitalSignCpf:      true,
    } as any,
  });

  if (!professional) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  const p = professional as any;
  if (!p.digitalSignProvider || !p.digitalSignCpf)
    return NextResponse.json({ error: "Configure sua assinatura digital no perfil primeiro." }, { status: 400 });

  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, professionalId: p.id },
  });
  if (!prescription)
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });

  // 2. Descriptografar CPF
  const cpf = safeDecrypt(p.digitalSignCpf);
  if (!cpf) return NextResponse.json({ error: "CPF não configurado" }, { status: 400 });

  try {
    // 3. Autenticar no CESS com CPF + OTP
    const authResult = await cessAuthenticate(cpf, otp);
    const [tcn, accessToken] = authResult.split("|");

    if (!tcn || !accessToken)
      return NextResponse.json({ error: "OTP inválido ou expirado. Tente novamente." }, { status: 401 });

    // 4. Buscar o HTML da receita e converter para bytes
    // Em produção: converter HTML → PDF real via puppeteer
    // Por ora enviamos os bytes do HTML — o CESS com auto_fix trata
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
    const sessionCookie = req.headers.get("cookie") || "";

    // Gerar PDF via fetch interno (reutilizando a rota existente)
    const pdfRes = await fetch(`${appUrl}/api/professional/prescriptions/${prescriptionId}/pdf`, {
      headers: { "cookie": sessionCookie },
    });
    const htmlBytes = Buffer.from(await pdfRes.text(), "utf-8");

    // 5. Criar nova transação CESS e fazer upload
    const signTcn = await cessCreateTransaction(accessToken);
    await cessUploadPdf(signTcn, accessToken, htmlBytes);

    // 6. Aguardar assinatura
    const resultUrl = await cessWaitSigned(signTcn, accessToken);
    const [, docId]  = resultUrl.split(`${CESS_BASE}/file-transfer/${signTcn}/`);

    // 7. Baixar PDF assinado
    const signedPdf = await cessDownloadSigned(signTcn, docId || "0", accessToken);

    // 8. Salvar no S3
    const signedUrl = await uploadSignedToS3(prescriptionId, signedPdf);

    // 9. Atualizar registro da prescrição
    await db.prescription.update({
      where: { id: prescriptionId },
      data:  {
        digitalSignature: `CESS:${p.digitalSignProvider}:${signTcn}:${new Date().toISOString()}`,
      },
    });

    // 10. Salvar URL do PDF assinado no documento relacionado
    if (prescription.documentId) {
      await db.medicalDocument.update({
        where: { id: prescription.documentId },
        data:  { fileUrl: signedUrl },
      });
    }

    await audit.updateRecord(session.user.id, "Prescription", prescriptionId);

    return NextResponse.json({
      success:    true,
      signedUrl,
      provider:   p.digitalSignProvider,
      signedAt:   new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("[DIGITAL SIGN ERROR]", err?.message);

    // Mensagens amigáveis para erros comuns
    if (err?.message?.includes("auth failed") || err?.message?.includes("401"))
      return NextResponse.json({ error: "OTP inválido ou expirado. Abra o app e tente com um código novo." }, { status: 401 });

    if (err?.message?.includes("timeout"))
      return NextResponse.json({ error: "Tempo esgotado. A assinatura no app demorou muito. Tente novamente." }, { status: 408 });

    return NextResponse.json({ error: "Erro ao assinar. Verifique sua conexão e tente novamente." }, { status: 500 });
  }
}
