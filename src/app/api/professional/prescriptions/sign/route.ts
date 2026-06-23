// VERSÃO DE DIAGNÓSTICO — sign/route.ts
// Testa cada etapa isoladamente e retorna o ponto exato da falha.
// NÃO assina de verdade. Use só para diagnosticar o 502.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const steps: string[] = [];
  try {
    steps.push("inicio");

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized", steps }, { status: 401 });
    }
    steps.push("auth-ok:" + session.user.id);

    const body = await req.json();
    const prescriptionId = String(body.prescriptionId || "");
    steps.push("body-ok:" + prescriptionId);

    // Variáveis de ambiente da Lacuna (sem expor a key inteira)
    steps.push("env-endpoint:" + (process.env.LACUNA_ENDPOINT || "VAZIO"));
    steps.push("env-apikey-len:" + String((process.env.LACUNA_API_KEY || "").length));
    steps.push("env-ctx:" + (process.env.LACUNA_SECURITY_CONTEXT || "VAZIO"));

    // Carrega a receita
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: { professional: true },
    });
    if (!prescription) {
      return NextResponse.json({ error: "Receita não encontrada", steps }, { status: 404 });
    }
    steps.push("prescription-ok");

    const pro = prescription.professional;
    steps.push("professional-ok:" + pro.id);

    // CPF de assinatura
    const proCpf = safeDecrypt((pro as { digitalSignCpf?: string | null }).digitalSignCpf ?? null);
    steps.push("cpf:" + (proCpf ? "PRESENTE(" + proCpf.length + ")" : "VAZIO"));

    // Testa importar o pdf-lib
    try {
      const pdfLib = await import("pdf-lib");
      steps.push("pdf-lib-import-ok:" + (typeof pdfLib.PDFDocument));
    } catch (e) {
      steps.push("pdf-lib-import-FAIL:" + (e as Error).message);
      return NextResponse.json({ error: "pdf-lib falhou", steps }, { status: 500 });
    }

    // Testa gerar um PDF mínimo
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      doc.addPage([300, 300]);
      const bytes = await doc.save();
      steps.push("pdf-gen-ok:" + bytes.length + "bytes");
    } catch (e) {
      steps.push("pdf-gen-FAIL:" + (e as Error).message);
      return NextResponse.json({ error: "geração PDF falhou", steps }, { status: 500 });
    }

    // Testa conectar na Lacuna (só um ping no endpoint, sem criar sessão)
    try {
      const endpoint = (process.env.LACUNA_ENDPOINT || "").replace(/\/+$/, "");
      const apiKey = process.env.LACUNA_API_KEY || "";
      const res = await fetch(`${endpoint}/api/signature-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ returnUrl: "https://app.doctor8.org/test", documents: [] }),
      });
      const txt = await res.text();
      steps.push("lacuna-status:" + res.status);
      steps.push("lacuna-resp:" + txt.slice(0, 300));
    } catch (e) {
      steps.push("lacuna-fetch-FAIL:" + (e as Error).message);
    }

    return NextResponse.json({ ok: true, steps });
  } catch (e) {
    steps.push("CATCH:" + ((e as Error).message || String(e)));
    return NextResponse.json({ error: "erro geral", steps }, { status: 500 });
  }
}
