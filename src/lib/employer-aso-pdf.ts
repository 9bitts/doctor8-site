import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AsoDocumentPayload = {
  generatedAt: string;
  company: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    grauRisco: number | null;
  };
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    department: string | null;
    jobTitle: string | null;
  };
  exam: {
    id: string;
    examType: string;
    examTypeLabel: string;
    completedAt: string | null;
    asoResult: string | null;
    asoResultLabel: string | null;
    asoRestrictions: string | null;
    physicianName: string | null;
    physicianCrm: string | null;
    clinicName: string | null;
  };
  signature?: {
    signedByName: string;
    signedByRegistro: string | null;
    signedAt: string;
  };
};

export async function buildAsoPdf(payload: AsoDocumentPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  let y = 780;
  const margin = 50;

  function line(text: string, bold = false, size = 10) {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= size + 6;
  }

  line("ATESTADO DE SAÚDE OCUPACIONAL (ASO)", true, 14);
  line("Doctor8 Empresas — Medicina do Trabalho", false, 9);
  line(`Emitido em: ${new Date(payload.generatedAt).toLocaleString("pt-BR")}`, false, 9);
  y -= 10;

  line("Empregador", true, 11);
  line(`${payload.company.nomeFantasia} — CNPJ ${payload.company.cnpj}`);
  line(`Razão social: ${payload.company.razaoSocial}`);
  line(`Grau de risco: ${payload.company.grauRisco ?? "—"}`);
  y -= 8;

  line("Trabalhador", true, 11);
  line(`${payload.employee.firstName} ${payload.employee.lastName}`);
  line(`E-mail: ${payload.employee.email}`);
  if (payload.employee.department) line(`Setor: ${payload.employee.department}`);
  if (payload.employee.jobTitle) line(`Função: ${payload.employee.jobTitle}`);
  y -= 8;

  line("Exame ocupacional", true, 11);
  line(`Tipo: ${payload.exam.examTypeLabel} (${payload.exam.examType})`);
  if (payload.exam.completedAt) {
    line(`Data conclusão: ${new Date(payload.exam.completedAt).toLocaleDateString("pt-BR")}`);
  }
  if (payload.exam.clinicName) line(`Clínica: ${payload.exam.clinicName}`);
  y -= 8;

  line("Resultado", true, 11);
  line(payload.exam.asoResultLabel ?? "Pendente", true, 12);
  if (payload.exam.asoRestrictions) {
    line(`Restrições: ${payload.exam.asoRestrictions}`);
  }
  y -= 8;

  if (payload.exam.physicianName) {
    line("Médico examinador", true, 11);
    line(`${payload.exam.physicianName}${payload.exam.physicianCrm ? ` — CRM ${payload.exam.physicianCrm}` : ""}`);
  }

  if (payload.signature) {
    y -= 16;
    line("Assinatura / validação", true, 11);
    line(`${payload.signature.signedByName}${payload.signature.signedByRegistro ? ` (${payload.signature.signedByRegistro})` : ""}`);
    line(`Em: ${new Date(payload.signature.signedAt).toLocaleString("pt-BR")}`);
  }

  y -= 20;
  line("Documento gerado eletronicamente. Validade jurídica sujeita à assinatura ICP-Brasil quando exigida.", false, 8);

  return doc.save();
}
