// src/app/api/professional/digital-sign/route.ts
// GET  — retorna provedor e CPF cadastrado (CPF mascarado)
// POST — salva provedor (BirdID ou VIDaaS) e CPF do profissional
// O CPF é armazenado criptografado (PHI).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["BirdID", "VIDaaS"]),
  cpf:      z.string().min(11).max(14), // "123.456.789-00" or "12345678900"
});

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
}

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where:  { userId: session.user.id },
    select: { digitalSignProvider: true, digitalSignCpf: true } as any,
  });

  if (!profile) return NextResponse.json({ configured: false });

  const p = profile as any;
  const cpfDecrypted = safeDecrypt(p.digitalSignCpf);

  return NextResponse.json({
    configured: !!(p.digitalSignProvider && p.digitalSignCpf),
    provider:   p.digitalSignProvider || null,
    cpfMasked:  cpfDecrypted ? maskCpf(cpfDecrypted) : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { provider, cpf } = parsed.data;
  const cpfDigits = cpf.replace(/\D/g, "");
  if (cpfDigits.length !== 11)
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });

  await db.professionalProfile.update({
    where: { userId: session.user.id },
    data:  {
      digitalSignProvider: provider,
      digitalSignCpf:      encrypt(cpfDigits),
    } as any,
  });

  return NextResponse.json({ success: true, provider, cpfMasked: maskCpf(cpfDigits) });
}
