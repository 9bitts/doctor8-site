/** Payloads preparatórios para eventos eSocial SST (S-2220 ASO, S-2240 condições ambientais). */

export type EsocialS2220Payload = {
  evento: "S-2220";
  versao: "S-1.2";
  geradoEm: string;
  empregador: {
    nrInsc: string;
    tpInsc: 1;
  };
  trabalhador: {
    cpf?: string;
    nmTrab: string;
    matricula?: string;
  };
  exameMedicoOcupacional: {
    tpExameOcup: number;
    dtAso: string;
    resAso: number;
    medico: {
      nmMed: string;
      nrCRM: string;
      ufCRM: string;
    };
    obs?: string;
  };
  observacao: string;
};

export type EsocialS2240Payload = {
  evento: "S-2240";
  versao: "S-1.2";
  geradoEm: string;
  empregador: {
    nrInsc: string;
    tpInsc: 1;
  };
  trabalhador: {
    cpf?: string;
    nmTrab: string;
    matricula?: string;
  };
  agNoc: Array<{
    codAgNoc: string;
    dscAgNoc: string;
    tpAval: number;
    intConc?: number;
    limTol?: number;
  }>;
  observacao: string;
};

const EXAM_TYPE_TO_ESOCIAL: Record<string, number> = {
  ADMISSIONAL: 0,
  PERIODICO: 1,
  RETORNO_TRABALHO: 2,
  MUDANCA_FUNCAO: 3,
  DEMISSIONAL: 4,
};

const ASO_RESULT_TO_ESOCIAL: Record<string, number> = {
  APTO: 1,
  APTO_COM_RESTRICAO: 2,
  INAPTO: 3,
};

function formatDateEsocial(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function buildS2220Payload(input: {
  company: { cnpj: string };
  employee: { firstName: string; lastName: string; email: string };
  exam: {
    examType: string;
    completedAt: Date | null;
    asoResult: string | null;
    physicianName: string | null;
    physicianCrm: string | null;
    asoRestrictions: string | null;
  };
}): EsocialS2220Payload | null {
  if (!input.exam.completedAt || !input.exam.asoResult || !input.exam.physicianName) {
    return null;
  }

  const crmParts = (input.exam.physicianCrm ?? "").split("/");
  const nrCRM = crmParts[0]?.replace(/\D/g, "") || input.exam.physicianCrm || "000000";
  const ufCRM = crmParts[1]?.toUpperCase() || "SP";

  return {
    evento: "S-2220",
    versao: "S-1.2",
    geradoEm: new Date().toISOString(),
    empregador: {
      nrInsc: cleanCnpj(input.company.cnpj),
      tpInsc: 1,
    },
    trabalhador: {
      nmTrab: `${input.employee.firstName} ${input.employee.lastName}`.trim(),
      matricula: input.employee.email,
    },
    exameMedicoOcupacional: {
      tpExameOcup: EXAM_TYPE_TO_ESOCIAL[input.exam.examType] ?? 1,
      dtAso: formatDateEsocial(input.exam.completedAt),
      resAso: ASO_RESULT_TO_ESOCIAL[input.exam.asoResult] ?? 1,
      medico: {
        nmMed: input.exam.physicianName,
        nrCRM,
        ufCRM,
      },
      obs: input.exam.asoRestrictions ?? undefined,
    },
    observacao:
      "Payload preparatório Doctor8 — validar no ambiente eSocial antes do envio. Não constitui transmissão automática.",
  };
}

export function buildS2240Payload(input: {
  company: { cnpj: string };
  employee: { firstName: string; lastName: string; email: string };
  risks: Array<{ hazardCode: string; hazardLabel: string; riskLevel: string }>;
}): EsocialS2240Payload {
  return {
    evento: "S-2240",
    versao: "S-1.2",
    geradoEm: new Date().toISOString(),
    empregador: {
      nrInsc: cleanCnpj(input.company.cnpj),
      tpInsc: 1,
    },
    trabalhador: {
      nmTrab: `${input.employee.firstName} ${input.employee.lastName}`.trim(),
      matricula: input.employee.email,
    },
    agNoc: input.risks.map((r) => ({
      codAgNoc: `09.01.${r.hazardCode}`,
      dscAgNoc: r.hazardLabel,
      tpAval: 2,
      intConc: r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH" ? 2 : 1,
    })),
    observacao:
      "Condições ambientais derivadas do inventário de riscos psicossociais PGR. Revisar códigos AGENTE NOCIVO com profissional habilitado antes do envio.",
  };
}
