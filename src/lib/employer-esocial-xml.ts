import type { EsocialS2220Payload, EsocialS2240Payload } from "@/lib/employer-esocial";

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function s2220PayloadToXml(payload: EsocialS2220Payload): string {
  const e = payload.exameMedicoOcupacional;
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
  <evtMonit Id="D8-${Date.now()}">
    <ideEvento>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>Doctor8-1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>${payload.empregador.tpInsc}</tpInsc>
      <nrInsc>${escXml(payload.empregador.nrInsc)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      ${payload.trabalhador.cpf ? `<cpfTrab>${escXml(payload.trabalhador.cpf.replace(/\D/g, ""))}</cpfTrab>` : ""}
      <matricula>${escXml(payload.trabalhador.matricula ?? payload.trabalhador.nmTrab)}</matricula>
    </ideVinculo>
    <exMedOcup>
      <tpExameOcup>${e.tpExameOcup}</tpExameOcup>
      <aso>
        <dtAso>${e.dtAso}</dtAso>
        <resAso>${e.resAso}</resAso>
        <medico>
          <nmMed>${escXml(e.medico.nmMed)}</nmMed>
          <nrCRM>${escXml(e.medico.nrCRM)}</nrCRM>
          <ufCRM>${escXml(e.medico.ufCRM)}</ufCRM>
        </medico>
        ${e.obs ? `<obs>${escXml(e.obs)}</obs>` : ""}
      </aso>
    </exMedOcup>
  </evtMonit>
</eSocial>`;
}

export function s2240PayloadToXml(payload: EsocialS2240Payload): string {
  const agents = payload.agNoc
    .map(
      (a) => `<agNoc>
      <codAgNoc>${escXml(a.codAgNoc)}</codAgNoc>
      <dscAgNoc>${escXml(a.dscAgNoc)}</dscAgNoc>
      <tpAval>${a.tpAval}</tpAval>
      ${a.intConc != null ? `<intConc>${a.intConc}</intConc>` : ""}
    </agNoc>`,
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00">
  <evtExpRisco Id="D8-${Date.now()}">
    <ideEvento>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>Doctor8-1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>${payload.empregador.tpInsc}</tpInsc>
      <nrInsc>${escXml(payload.empregador.nrInsc)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      ${payload.trabalhador.cpf ? `<cpfTrab>${escXml(payload.trabalhador.cpf.replace(/\D/g, ""))}</cpfTrab>` : ""}
      <matricula>${escXml(payload.trabalhador.matricula ?? payload.trabalhador.nmTrab)}</matricula>
    </ideVinculo>
    <infoExpRisco>
      ${agents}
    </infoExpRisco>
  </evtExpRisco>
</eSocial>`;
}
