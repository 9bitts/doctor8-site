// Minimal TISS 4.01 XML export for consulta and odonto guides (batch)

export type TissGuideType = "CONSULTA" | "ODONTO";

export type TissGuideExport = {
  guideNumber: string;
  guideType: TissGuideType;
  procedureCode: string;
  procedureName: string;
  amountCents: number;
  patientName: string;
  patientCpf?: string | null;
  cardNumber?: string | null;
  serviceDate: Date;
  professionalName: string;
  professionalCouncilNumber?: string | null;
};

export type TissBatchExportContext = {
  batchNumber: string;
  operatorName: string;
  ansRegistry?: string | null;
  contractNumber?: string | null;
  providerCnpj: string;
  providerName: string;
  periodStart: Date;
  periodEnd: Date;
  tissVersion: string;
  guides: TissGuideExport[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

function buildConsultaGuideXml(g: TissGuideExport, index: number): string {
  return `
    <guiaConsulta numeroGuiaPrestador="${esc(g.guideNumber || `G${index + 1}`)}">
      <dadosBeneficiario>
        <numeroCarteira>${esc(g.cardNumber || "")}</numeroCarteira>
        <nomeBeneficiario>${esc(g.patientName)}</nomeBeneficiario>
      </dadosBeneficiario>
      <dadosContratadoExecutante>
        <nomeContratado>${esc(g.professionalName)}</nomeContratado>
        <numeroConselhoProfissional>${esc(g.professionalCouncilNumber || "")}</numeroConselhoProfissional>
      </dadosContratadoExecutante>
      <dadosAtendimento>
        <dataAtendimento>${fmtDate(g.serviceDate)}</dataAtendimento>
        <procedimento>
          <codigoProcedimento>${esc(g.procedureCode)}</codigoProcedimento>
          <descricaoProcedimento>${esc(g.procedureName)}</descricaoProcedimento>
          <valorProcedimento>${fmtMoney(g.amountCents)}</valorProcedimento>
        </procedimento>
      </dadosAtendimento>
    </guiaConsulta>`;
}

function buildOdontoGuideXml(g: TissGuideExport, index: number): string {
  return `
    <guiaTratamentoOdontologico numeroGuiaPrestador="${esc(g.guideNumber || `G${index + 1}`)}">
      <dadosBeneficiario>
        <numeroCarteira>${esc(g.cardNumber || "")}</numeroCarteira>
        <nomeBeneficiario>${esc(g.patientName)}</nomeBeneficiario>
      </dadosBeneficiario>
      <dadosContratadoExecutante>
        <nomeContratado>${esc(g.professionalName)}</nomeContratado>
        <numeroConselhoProfissional>${esc(g.professionalCouncilNumber || "")}</numeroConselhoProfissional>
      </dadosContratadoExecutante>
      <dataAtendimento>${fmtDate(g.serviceDate)}</dataAtendimento>
      <procedimentosExecutados>
        <procedimentoExecutado>
          <codigoProcedimento>${esc(g.procedureCode)}</codigoProcedimento>
          <descricaoProcedimento>${esc(g.procedureName)}</descricaoProcedimento>
          <valorProcedimento>${fmtMoney(g.amountCents)}</valorProcedimento>
        </procedimentoExecutado>
      </procedimentosExecutados>
    </guiaTratamentoOdontologico>`;
}

export function buildTissBatchXml(ctx: TissBatchExportContext): string {
  const guidesXml = ctx.guides
    .map((g, i) =>
      g.guideType === "ODONTO" ? buildOdontoGuideXml(g, i) : buildConsultaGuideXml(g, i),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mensagemTISS xmlns="http://www.ans.gov.br/padroes/tiss/schemas">
  <cabecalho>
    <identificacaoTransacao>
      <tipoTransacao>ENVIO_LOTE_GUIAS</tipoTransacao>
      <sequencialTransacao>1</sequencialTransacao>
      <dataRegistroTransacao>${fmtDate(new Date())}</dataRegistroTransacao>
      <horaRegistroTransacao>${new Date().toISOString().slice(11, 19)}</horaRegistroTransacao>
    </identificacaoTransacao>
    <origem>
      <identificacaoPrestador>
        <codigoPrestadorNaOperadora>${esc(ctx.contractNumber || ctx.providerCnpj)}</codigoPrestadorNaOperadora>
      </identificacaoPrestador>
    </origem>
    <destino>
      <registroANS>${esc(ctx.ansRegistry || "")}</registroANS>
    </destino>
    <Padrao>${esc(ctx.tissVersion)}</Padrao>
  </cabecalho>
  <prestadorParaOperadora>
    <loteGuias>
      <numeroLote>${esc(ctx.batchNumber)}</numeroLote>
      <operadora>${esc(ctx.operatorName)}</operadora>
      <periodoInicio>${fmtDate(ctx.periodStart)}</periodoInicio>
      <periodoFim>${fmtDate(ctx.periodEnd)}</periodoFim>
      <guiasTISS>${guidesXml}
      </guiasTISS>
    </loteGuias>
  </prestadorParaOperadora>
</mensagemTISS>`;
}

export function buildAccountingCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join(";")),
  ];
  return lines.join("\n");
}
