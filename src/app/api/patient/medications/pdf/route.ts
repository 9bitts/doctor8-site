import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      medications: {
        where: { active: true },
        orderBy: [{ flow: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!patient) return new NextResponse("Not found", { status: 404 });

  await audit.exportData(session.user.id);

  const firstName = decrypt(patient.firstName);
  const lastName = decrypt(patient.lastName);

  const clinical = patient.medications.filter((m) => m.flow === "CLINICAL");
  const purchase = patient.medications.filter((m) => m.flow === "PURCHASE");

  function row(m: (typeof patient.medications)[0]) {
    return `<tr>
      <td>${esc(decrypt(m.name))}</td>
      <td>${esc(m.dosage ? decrypt(m.dosage) : "?")}</td>
      <td>${esc(m.frequency ? decrypt(m.frequency) : "?")}</td>
      <td>${esc(m.prescribedBy || "?")}</td>
    </tr>`;
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Medicamentos ? ${esc(firstName)} ${esc(lastName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0a4d6e; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 28px; font-weight: 900; color: #0a4d6e; }
  .logo span { color: #00b87a; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0a4d6e; text-transform: uppercase; letter-spacing: .05em; border-left: 3px solid #00b87a; padding-left: 8px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th { background: #0a4d6e; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f8fafc; }
  .empty { color: #666; font-size: 12px; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } @page { margin: 1cm; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Doctor<span>8</span></div>
    <div style="font-size:11px;color:#666;margin-top:4px;">Lista de medicamentos</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#666;">
    <div><strong>${esc(firstName)} ${esc(lastName)}</strong></div>
    <div>Gerado em ${esc(today)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Medicamentos cl?nicos</div>
  ${
    clinical.length === 0
      ? '<p class="empty">Nenhum medicamento cl?nico ativo.</p>'
      : `<table><thead><tr><th>Medicamento</th><th>Dose</th><th>Frequ?ncia</th><th>Prescrito por</th></tr></thead><tbody>${clinical.map(row).join("")}</tbody></table>`
  }
</div>

<div class="section">
  <div class="section-title">Lista pessoal / refer?ncia CMED</div>
  ${
    purchase.length === 0
      ? '<p class="empty">Nenhum item na lista pessoal.</p>'
      : `<table><thead><tr><th>Medicamento</th><th>Apresenta??o</th><th>Notas</th><th>?</th></tr></thead><tbody>${purchase.map(row).join("")}</tbody></table>`
  }
</div>

<div class="footer">Documento gerado pelo paciente ? Doctor8 ? Informa??o confidencial (LGPD/HIPAA)</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
