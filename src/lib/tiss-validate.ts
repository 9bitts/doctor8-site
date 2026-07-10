import type { TissBatchExportContext, TissGuideExport } from "@/lib/tiss-export";

export type TissValidationIssue = { field: string; message: string };

function requireField(value: string | null | undefined, field: string, label: string): TissValidationIssue | null {
  if (!value?.trim()) return { field, message: `${label} é obrigatório` };
  return null;
}

function validateGuide(g: TissGuideExport, index: number): TissValidationIssue[] {
  const prefix = `guides[${index}]`;
  const issues: TissValidationIssue[] = [];

  for (const issue of [
    requireField(g.patientName, `${prefix}.patientName`, "Nome do beneficiário"),
    requireField(g.procedureCode, `${prefix}.procedureCode`, "Código TUSS"),
    requireField(g.procedureName, `${prefix}.procedureName`, "Descrição do procedimento"),
    requireField(g.professionalName, `${prefix}.professionalName`, "Nome do profissional"),
  ]) {
    if (issue) issues.push(issue);
  }

  if (!g.cardNumber?.trim() && !g.patientCpf?.trim()) {
    issues.push({
      field: `${prefix}.cardNumber`,
      message: "Informe número da carteirinha ou CPF do beneficiário",
    });
  }

  if (g.amountCents <= 0) {
    issues.push({ field: `${prefix}.amountCents`, message: "Valor do procedimento deve ser maior que zero" });
  }

  if (!g.professionalCouncilNumber?.trim()) {
    issues.push({
      field: `${prefix}.professionalCouncilNumber`,
      message: "Número do conselho profissional é obrigatório",
    });
  }

  return issues;
}

/** Structural validation before TISS batch export (not full ANS XSD). */
export function validateTissBatch(ctx: TissBatchExportContext): TissValidationIssue[] {
  const issues: TissValidationIssue[] = [];

  for (const issue of [
    requireField(ctx.batchNumber, "batchNumber", "Número do lote"),
    requireField(ctx.operatorName, "operatorName", "Nome da operadora"),
    requireField(ctx.providerCnpj, "providerCnpj", "CNPJ do prestador"),
    requireField(ctx.providerName, "providerName", "Nome do prestador"),
    requireField(ctx.tissVersion, "tissVersion", "Versão TISS"),
  ]) {
    if (issue) issues.push(issue);
  }

  if (!ctx.ansRegistry?.trim() && !ctx.contractNumber?.trim()) {
    issues.push({
      field: "ansRegistry",
      message: "Informe registro ANS ou número do contrato com a operadora",
    });
  }

  if (ctx.guides.length === 0) {
    issues.push({ field: "guides", message: "O lote deve conter ao menos uma guia" });
  }

  ctx.guides.forEach((g, i) => issues.push(...validateGuide(g, i)));

  if (!ctx.periodStart || !ctx.periodEnd || ctx.periodStart > ctx.periodEnd) {
    issues.push({ field: "period", message: "Período do lote inválido" });
  }

  return issues;
}
