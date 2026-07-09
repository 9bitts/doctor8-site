import { privacySections } from "@/lib/legal/privacy-content";
import { termsSections } from "@/lib/legal/terms-content";
import { TELEMEDICINE_TCLE_SECTIONS } from "@/lib/legal/tcle-telemedicine";
import type { ComplianceDoc } from "./types";
import { sectionsFromTri } from "./utils";

export const publishedComplianceDocs: ComplianceDoc[] = [
  {
    slug: "politica-privacidade",
    title: "Política de Privacidade",
    description:
      "Documento público que informa aos titulares como a INFO8 coleta, usa, armazena e compartilha dados pessoais na plataforma Doctor8.",
    legalBasis: "Art. 9º e Art. 20, LGPD",
    required: true,
    status: "published",
    lastUpdated: "Janeiro de 2026",
    canonicalPath: "/privacy",
    sections: sectionsFromTri(privacySections),
  },
  {
    slug: "termo-uso",
    title: "Termo de Uso",
    description: "Regras para uso da plataforma Doctor8 por pacientes, profissionais, empregadores e demais usuários.",
    legalBasis: "Boa prática contratual",
    required: false,
    status: "published",
    lastUpdated: "Janeiro de 2026",
    canonicalPath: "/terms",
    sections: sectionsFromTri(termsSections),
  },
  {
    slug: "tcle-telemedicina",
    title: "TCLE — Termo de Consentimento para Telemedicina",
    description:
      "Consentimento livre, informado e específico para atendimento em saúde a distância, incluindo fluxos humanitários e psicologia.",
    legalBasis: "Art. 7º, I; Art. 8º; Art. 11, LGPD · Res. CFM 2.314/2022 · Lei 13.989/2020",
    required: true,
    status: "published",
    lastUpdated: "27/06/2026",
    canonicalPath: "/tcle-telemedicina",
    sections: sectionsFromTri(TELEMEDICINE_TCLE_SECTIONS),
  },
];
