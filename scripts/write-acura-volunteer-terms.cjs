const fs = require("fs");
const path = require("path");

const C = String.fromCharCode;

const ch = {
  aAc: C(225),
  aGr: C(224),
  aTi: C(227),
  eAc: C(233),
  eCi: C(234),
  iAc: C(237),
  oAc: C(243),
  oCi: C(244),
  oTi: C(245),
  uAc: C(250),
  cCe: C(231),
  nTi: C(241),
  AAc: C(193),
  EAc: C(201),
  IAc: C(205),
  OAc: C(211),
  UAc: C(218),
  ATi: C(195),
  CCe: C(199),
  NTi: C(209),
};

const heading = `Termo de Ades${ch.aTi}o ao Servi${ch.cCe}o Volunt${ch.aAc}rio AcuraBrasil`;

const sections = [
  {
    title: {
      pt: `Identifica${ch.cCe}${ch.aTi}o e objeto`,
      en: "Identification and purpose",
      es: `Identificaci${ch.oAc}n y objeto`,
    },
    content: {
      pt: `A ACURA BRASIL, CNPJ 30.350.850/0001-80, OSCIP sediada em Belo Horizonte/MG, e a INFO8, CNPJ 20.251.527/0001-04, operadora da plataforma Doctor8, celebram este termo para o programa Selo Volunt${ch.aAc}rio, conectando profissionais de sa${ch.uAc}de a pacientes em situa${ch.cCe}${ch.aTi}o de vulnerabilidade social.`,
      en: "ACURA BRASIL, Tax ID 30.350.850/0001-80, an OSCIP based in Belo Horizonte/MG, and INFO8, Tax ID 20.251.527/0001-04, operator of the Doctor8 platform, execute this agreement for the Volunteer Badge program, connecting healthcare professionals to socially vulnerable patients.",
      es: `ACURA BRASIL, CNPJ 30.350.850/0001-80, OSCIP con sede en Belo Horizonte/MG, e INFO8, CNPJ 20.251.527/0001-04, operadora de la plataforma Doctor8, celebran este acuerdo para el programa Sello Voluntario, conectando profesionales de salud con pacientes en situaci${ch.oAc}n de vulnerabilidad social.`,
    },
  },
  {
    title: {
      pt: `Fundamenta${ch.cCe}${ch.aTi}o legal`,
      en: "Legal framework",
      es: `Fundamentaci${ch.oAc}n legal`,
    },
    content: {
      pt: `Este termo segue a Lei 9.608/1998 sobre voluntariado, com termo de ades${ch.aTi}o previsto nos arts. 1 e 2, al${ch.eAc}m da LGPD, da Lei 13.989/2020 e da Resolu${ch.cCe}${ch.aTi}o CFM 2314/2022. Tamb${ch.eAc}m se aplicam os documentos /terms, /privacy e /tcle-telemedicina.`,
      en: "This agreement follows Law 9.608/1998 on volunteering, including the adhesion instrument required by articles 1 and 2, as well as LGPD, Law 13.989/2020, and CFM Resolution 2314/2022. The documents at /terms, /privacy, and /tcle-telemedicina also apply.",
      es: `Este acuerdo sigue la Ley 9.608/1998 sobre voluntariado, con acuerdo de adhesi${ch.oAc}n previsto en los arts. 1 y 2, adem${ch.aAc}s de la LGPD, de la Ley 13.989/2020 y de la Resoluci${ch.oAc}n CFM 2314/2022. Tambi${ch.eAc}n aplican los documentos /terms, /privacy y /tcle-telemedicina.`,
    },
  },
  {
    title: {
      pt: `Defini${ch.cCe}${ch.oTi}es`,
      en: "Definitions",
      es: "Definiciones",
    },
    content: {
      pt: `Para este termo: atendimento volunt${ch.aAc}rio ${ch.eAc} consulta sem cobran${ch.cCe}a ao paciente; hor${ch.aAc}rio volunt${ch.aAc}rio ${ch.eAc} bloco verde reservado ao programa; hor${ch.aAc}rio particular ${ch.eAc} per${ch.iAc}odo remunerado fora do bloco verde; selo ${ch.eAc} a identifica${ch.cCe}${ch.aTi}o do aderente; rede humanit${ch.aAc}ria AcuraBrasil ${ch.eAc} a rede solid${ch.aAc}ria de cuidado.`,
      en: "For this agreement: volunteer care means no patient charge; volunteer time means a green slot reserved for the program; private time means paid care outside green slots; badge means visual identification of adherent professionals; AcuraBrasil humanitarian network means the solidarity care network.",
      es: `Para este acuerdo: atenci${ch.oAc}n voluntaria significa consulta sin cobro al paciente; horario voluntario significa bloque verde reservado al programa; horario particular significa periodo remunerado fuera del bloque verde; sello significa identificaci${ch.oAc}n visual del profesional adherido; red humanitaria AcuraBrasil significa red solidaria de cuidado.`,
    },
  },
  {
    title: {
      pt: "Natureza",
      en: "Nature of the relationship",
      es: "Naturaleza",
    },
    content: {
      pt: `Nos termos do art. 1, par${ch.aAc}grafo ${ch.uAc}nico, da Lei 9.608/1998, o servi${ch.cCe}o volunt${ch.aAc}rio n${ch.aTi}o gera v${ch.iAc}nculo empregat${ch.iAc}cio, obriga${ch.cCe}${ch.aTi}o trabalhista nem contrapresta${ch.cCe}${ch.aTi}o financeira. ${ch.EAc} permitido modelo h${ch.iAc}brido com hor${ch.aAc}rios particulares, e a INFO8 atua somente como intermedi${ch.aAc}ria tecnol${ch.oAc}gica.`,
      en: "Under article 1, sole paragraph, of Law 9.608/1998, this volunteer service does not create an employment relationship, labor obligations, or financial compensation. A hybrid model with private paid slots is allowed, and INFO8 acts only as a technology intermediary.",
      es: `Seg${ch.uAc}n el art. 1, p${ch.aAc}rrafo ${ch.uAc}nico, de la Ley 9.608/1998, este servicio voluntario no genera v${ch.iAc}nculo laboral, obligaciones de empleo ni contraprestaci${ch.oAc}n financiera. Se permite un modelo h${ch.iAc}brido con horarios particulares, y INFO8 act${ch.uAc}a solo como intermediaria tecnol${ch.oAc}gica.`,
    },
  },
  {
    title: {
      pt: "Funcionamento Doctor8",
      en: "Doctor8 operation",
      es: "Funcionamiento de Doctor8",
    },
    content: {
      pt: `O funcionamento no Doctor8 exige conta verificada, marca${ch.cCe}${ch.aTi}o do checkbox "Sou volunt${ch.aAc}rio AcuraBrasil" e configura${ch.cCe}${ch.aTi}o de disponibilidade em blocos verdes. Atendimentos particulares permanecem pagos fora dos hor${ch.aAc}rios volunt${ch.aAc}rios.`,
      en: "Participation on Doctor8 requires a verified account, enabling the checkbox \"I am an AcuraBrasil volunteer\", and configuring availability as green blocks. Private paid appointments remain allowed outside volunteer slots.",
      es: `El funcionamiento en Doctor8 exige cuenta verificada, activaci${ch.oAc}n del checkbox "Soy voluntario AcuraBrasil" y configuraci${ch.oAc}n de disponibilidad en bloques verdes. Las consultas particulares pagadas se mantienen fuera de los horarios voluntarios.`,
    },
  },
  {
    title: {
      pt: `Obriga${ch.cCe}${ch.oTi}es do Volunt${ch.aAc}rio`,
      en: "Volunteer obligations",
      es: "Obligaciones del voluntario",
    },
    content: {
      pt: `O volunt${ch.aAc}rio deve atuar com ${ch.eAc}tica profissional, manter registro ativo no conselho, cumprir pontualidade, n${ch.aTi}o cobrar no hor${ch.aAc}rio volunt${ch.aAc}rio, registrar o atendimento no prontu${ch.aAc}rio eletr${ch.oCi}nico, encaminhar casos urgentes e emergentes, e n${ch.aTi}o usar o selo de forma indevida.`,
      en: "The volunteer must follow professional ethics, keep an active license, be punctual, avoid charging in volunteer slots, register care in the EHR, refer urgent or emergency situations, and never misuse the badge.",
      es: `El voluntario debe actuar con ${ch.eAc}tica profesional, mantener licencia activa, cumplir puntualidad, no cobrar en horarios voluntarios, registrar la atenci${ch.oAc}n en la historia cl${ch.iAc}nica electr${ch.oAc}nica, derivar casos urgentes y emergentes, y no usar indebidamente el sello.`,
    },
  },
  {
    title: {
      pt: "Direitos",
      en: "Rights",
      es: "Derechos",
    },
    content: {
      pt: `S${ch.aTi}o direitos do volunt${ch.aAc}rio: receber informa${ch.cCe}${ch.oTi}es sobre campanhas, usar a infraestrutura da Doctor8 para os atendimentos, exibir o selo do programa, obter reembolso de despesas previamente autorizadas (art. 3 da Lei 9.608/1998), retirar-se a qualquer tempo e ter tratamento de dados conforme a LGPD.`,
      en: "Volunteer rights include campaign information, Doctor8 infrastructure for appointments, use of the program badge, reimbursement of pre-authorized expenses under article 3 of Law 9.608/1998, withdrawal at any time, and data protection under LGPD.",
      es: `Son derechos del voluntario: recibir informaci${ch.oAc}n sobre campa${ch.nTi}as, usar la infraestructura de Doctor8 para las atenciones, exhibir el sello del programa, obtener reembolso de gastos previamente autorizados (art. 3 de la Ley 9.608/1998), retirarse en cualquier momento y tener tratamiento de datos conforme a la LGPD.`,
    },
  },
  {
    title: {
      pt: `Obriga${ch.cCe}${ch.oTi}es da ACURA BRASIL e INFO8`,
      en: "ACURA BRASIL and INFO8 obligations",
      es: "Obligaciones de ACURA BRASIL e INFO8",
    },
    content: {
      pt: `ACURA BRASIL e INFO8 devem oferecer orienta${ch.cCe}${ch.aTi}o operacional, comunicar resultados com transpar${ch.eAc}ncia em acurabrasil.org/transparencia e manter regras claras de uso da plataforma. N${ch.aTi}o h${ch.aAc} exig${ch.eAc}ncia de carga fixa, n${ch.uAc}mero m${ch.iAc}nimo de consultas ou metas de quota.`,
      en: "ACURA BRASIL and INFO8 must provide operational guidance, publish transparency information at acurabrasil.org/transparencia, and keep clear platform rules. There are no fixed schedule quotas, minimum appointment counts, or mandatory targets.",
      es: `ACURA BRASIL e INFO8 deben ofrecer orientaci${ch.oAc}n operativa, comunicar resultados con transparencia en acurabrasil.org/transparencia y mantener reglas claras de uso de la plataforma. No hay exigencia de carga fija, cantidad m${ch.iAc}nima de consultas ni metas de cuota.`,
    },
  },
  {
    title: {
      pt: "Responsabilidade profissional",
      en: "Professional responsibility",
      es: "Responsabilidad profesional",
    },
    content: {
      pt: `A responsabilidade cl${ch.iAc}nica e ${ch.eAc}tica pelo atendimento volunt${ch.aAc}rio ${ch.eAc} exclusiva do profissional. O programa n${ch.aTi}o substitui servi${ch.cCe}os de urg${ch.eCi}ncia e emerg${ch.eCi}ncia e pode ter limita${ch.cCe}${ch.oTi}es adicionais em campanhas internacionais, conforme licen${ch.cCe}as e regras locais.`,
      en: "Clinical and ethical responsibility for volunteer care belongs solely to the professional. The program does not replace emergency services and may include additional limits for international campaigns, depending on local licensing and rules.",
      es: `La responsabilidad cl${ch.iAc}nica y ${ch.eAc}tica por la atenci${ch.oAc}n voluntaria es exclusiva del profesional. El programa no reemplaza servicios de urgencia o emergencia y puede tener limitaciones adicionales en campa${ch.nTi}as internacionales, seg${ch.uAc}n licencias y reglas locales.`,
    },
  },
  {
    title: {
      pt: "LGPD",
      en: "LGPD and data privacy",
      es: "Proteccin de datos (LGPD)",
    },
    content: {
      pt: `Dados pessoais e sens${ch.iAc}veis dos pacientes devem ser usados apenas para finalidade assistencial, com confidencialidade e sigilo profissional, em conformidade com a LGPD. Incidentes de seguran${ch.cCe}a ou privacidade devem ser reportados imediatamente pelos canais oficiais.`,
      en: "Personal and sensitive patient data must be used only for care purposes, with confidentiality and professional secrecy, in accordance with LGPD. Security or privacy incidents must be reported immediately through official channels.",
      es: `Los datos personales y sensibles de los pacientes deben usarse solo para fines asistenciales, con confidencialidad y secreto profesional, de acuerdo con la LGPD. Los incidentes de seguridad o privacidad deben reportarse de inmediato por los canales oficiales.`,
    },
  },
  {
    title: {
      pt: `Vig${ch.eAc}ncia, aceite e rescis${ch.aTi}o`,
      en: "Term, acceptance, and termination",
      es: `Vigencia, aceptaci${ch.oAc}n y rescisi${ch.oAc}n`,
    },
    content: {
      pt: `A vig${ch.eAc}ncia inicia no aceite digital ao habilitar o checkbox, conforme art. 2 da Lei 9.608/1998. Altera${ch.cCe}${ch.oTi}es deste termo ser${ch.aTi}o notificadas; qualquer parte pode rescindir a ades${ch.aTi}o a qualquer tempo, ficando eleito o foro de Belo Horizonte/MG, com contato em acurabrasil.org/contato.`,
      en: "Validity starts upon digital acceptance by enabling the checkbox, under article 2 of Law 9.608/1998. Changes will be notified; either party may terminate adhesion at any time, and venue is Belo Horizonte/MG, with contact at acurabrasil.org/contato.",
      es: `La vigencia inicia con la aceptaci${ch.oAc}n digital al habilitar el checkbox, conforme al art. 2 de la Ley 9.608/1998. Las modificaciones ser${ch.aAc}n notificadas; cualquier parte puede rescindir la adhesi${ch.oAc}n en cualquier momento, con foro en Belo Horizonte/MG y contacto en acurabrasil.org/contato.`,
    },
  },
];

const targetPath = path.join(__dirname, "..", "src", "lib", "legal", "acura-volunteer-terms.ts");

const ts = [
  `'${heading}';`,
  "",
  'export const ACURA_VOLUNTEER_TERMS_VERSION = "1.0";',
  'export const ACURA_VOLUNTEER_TERMS_LAST_UPDATED = "29/06/2026";',
  "",
  "export type AcuraVolunteerTermsSection = {",
  "  title: { pt: string; en: string; es: string };",
  "  content: { pt: string; en: string; es: string };",
  "};",
  "",
  `export const ACURA_VOLUNTEER_TERMS_SECTIONS: AcuraVolunteerTermsSection[] = ${JSON.stringify(sections, null, 2)};`,
  "",
].join("\n");

fs.writeFileSync(targetPath, ts, "utf8");
console.log(`Wrote ${targetPath}`);
