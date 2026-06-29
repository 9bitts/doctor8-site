// Termo de Adesão ao Serviço Voluntário AcuraBrasil — Lei nº 9.608/1998

export const ACURA_VOLUNTEER_TERMS_VERSION = "1.0";
export const ACURA_VOLUNTEER_TERMS_LAST_UPDATED = "29/06/2026";

export type AcuraVolunteerTermsSection = {
  title: { pt: string; en: string; es: string };
  content: { pt: string; en: string; es: string };
};

export const ACURA_VOLUNTEER_TERMS_SECTIONS: AcuraVolunteerTermsSection[] = [
  {
    "title": {
      "pt": "Identificação e objeto",
      "en": "Identification and purpose",
      "es": "Identificación y objeto"
    },
    "content": {
      "pt": "A ACURA BRASIL, CNPJ 30.350.850/0001-80, OSCIP sediada em Belo Horizonte/MG, e a INFO8, CNPJ 20.251.527/0001-04, operadora da plataforma Doctor8, celebram este termo para o programa Selo Voluntário, conectando profissionais de saúde a pacientes em situação de vulnerabilidade social.",
      "en": "ACURA BRASIL, Tax ID 30.350.850/0001-80, an OSCIP based in Belo Horizonte/MG, and INFO8, Tax ID 20.251.527/0001-04, operator of the Doctor8 platform, execute this agreement for the Volunteer Badge program, connecting healthcare professionals to socially vulnerable patients.",
      "es": "ACURA BRASIL, CNPJ 30.350.850/0001-80, OSCIP con sede en Belo Horizonte/MG, e INFO8, CNPJ 20.251.527/0001-04, operadora de la plataforma Doctor8, celebran este acuerdo para el programa Sello Voluntario, conectando profesionales de salud con pacientes en situación de vulnerabilidad social."
    }
  },
  {
    "title": {
      "pt": "Fundamentação legal",
      "en": "Legal framework",
      "es": "Fundamentación legal"
    },
    "content": {
      "pt": "Este termo segue a Lei 9.608/1998 sobre voluntariado, com termo de adesão previsto nos arts. 1 e 2, além da LGPD, da Lei 13.989/2020 e da Resolução CFM 2314/2022. Também se aplicam os documentos /terms, /privacy e /tcle-telemedicina.",
      "en": "This agreement follows Law 9.608/1998 on volunteering, including the adhesion instrument required by articles 1 and 2, as well as LGPD, Law 13.989/2020, and CFM Resolution 2314/2022. The documents at /terms, /privacy, and /tcle-telemedicina also apply.",
      "es": "Este acuerdo sigue la Ley 9.608/1998 sobre voluntariado, con acuerdo de adhesión previsto en los arts. 1 y 2, además de la LGPD, de la Ley 13.989/2020 y de la Resolución CFM 2314/2022. También aplican los documentos /terms, /privacy y /tcle-telemedicina."
    }
  },
  {
    "title": {
      "pt": "Definições",
      "en": "Definitions",
      "es": "Definiciones"
    },
    "content": {
      "pt": "Para este termo: atendimento voluntário é consulta sem cobrança ao paciente; horário voluntário é bloco verde reservado ao programa; horário particular é período remunerado fora do bloco verde; selo é a identificação do aderente; rede humanitária AcuraBrasil é a rede solidária de cuidado.",
      "en": "For this agreement: volunteer care means no patient charge; volunteer time means a green slot reserved for the program; private time means paid care outside green slots; badge means visual identification of adherent professionals; AcuraBrasil humanitarian network means the solidarity care network.",
      "es": "Para este acuerdo: atención voluntaria significa consulta sin cobro al paciente; horario voluntario significa bloque verde reservado al programa; horario particular significa periodo remunerado fuera del bloque verde; sello significa identificación visual del profesional adherido; red humanitaria AcuraBrasil significa red solidaria de cuidado."
    }
  },
  {
    "title": {
      "pt": "Natureza",
      "en": "Nature of the relationship",
      "es": "Naturaleza"
    },
    "content": {
      "pt": "Nos termos do art. 1, parágrafo único, da Lei 9.608/1998, o serviço voluntário não gera vínculo empregatício, obrigação trabalhista nem contraprestação financeira. É permitido modelo híbrido com horários particulares, e a INFO8 atua somente como intermediária tecnológica.",
      "en": "Under article 1, sole paragraph, of Law 9.608/1998, this volunteer service does not create an employment relationship, labor obligations, or financial compensation. A hybrid model with private paid slots is allowed, and INFO8 acts only as a technology intermediary.",
      "es": "Según el art. 1, párrafo único, de la Ley 9.608/1998, este servicio voluntario no genera vínculo laboral, obligaciones de empleo ni contraprestación financiera. Se permite un modelo híbrido con horarios particulares, y INFO8 actúa solo como intermediaria tecnológica."
    }
  },
  {
    "title": {
      "pt": "Funcionamento Doctor8",
      "en": "Doctor8 operation",
      "es": "Funcionamiento de Doctor8"
    },
    "content": {
      "pt": "O funcionamento no Doctor8 exige conta verificada, marcação do checkbox \"Sou voluntário AcuraBrasil\" e configuração de disponibilidade em blocos verdes. Atendimentos particulares permanecem pagos fora dos horários voluntários.",
      "en": "Participation on Doctor8 requires a verified account, enabling the checkbox \"I am an AcuraBrasil volunteer\", and configuring availability as green blocks. Private paid appointments remain allowed outside volunteer slots.",
      "es": "El funcionamiento en Doctor8 exige cuenta verificada, activación del checkbox \"Soy voluntario AcuraBrasil\" y configuración de disponibilidad en bloques verdes. Las consultas particulares pagadas se mantienen fuera de los horarios voluntarios."
    }
  },
  {
    "title": {
      "pt": "Obrigações do Voluntário",
      "en": "Volunteer obligations",
      "es": "Obligaciones del voluntario"
    },
    "content": {
      "pt": "O voluntário deve atuar com ética profissional, manter registro ativo no conselho, cumprir pontualidade, não cobrar no horário voluntário, registrar o atendimento no prontuário eletrônico, encaminhar casos urgentes e emergentes, e não usar o selo de forma indevida.",
      "en": "The volunteer must follow professional ethics, keep an active license, be punctual, avoid charging in volunteer slots, register care in the EHR, refer urgent or emergency situations, and never misuse the badge.",
      "es": "El voluntario debe actuar con ética profesional, mantener licencia activa, cumplir puntualidad, no cobrar en horarios voluntarios, registrar la atención en la historia clínica electrónica, derivar casos urgentes y emergentes, y no usar indebidamente el sello."
    }
  },
  {
    "title": {
      "pt": "Direitos",
      "en": "Rights",
      "es": "Derechos"
    },
    "content": {
      "pt": "São direitos do voluntário: receber informações sobre campanhas, usar a infraestrutura da Doctor8 para os atendimentos, exibir o selo do programa, obter reembolso de despesas previamente autorizadas (art. 3 da Lei 9.608/1998), retirar-se a qualquer tempo e ter tratamento de dados conforme a LGPD.",
      "en": "Volunteer rights include campaign information, Doctor8 infrastructure for appointments, use of the program badge, reimbursement of pre-authorized expenses under article 3 of Law 9.608/1998, withdrawal at any time, and data protection under LGPD.",
      "es": "Son derechos del voluntario: recibir información sobre campañas, usar la infraestructura de Doctor8 para las atenciones, exhibir el sello del programa, obtener reembolso de gastos previamente autorizados (art. 3 de la Ley 9.608/1998), retirarse en cualquier momento y tener tratamiento de datos conforme a la LGPD."
    }
  },
  {
    "title": {
      "pt": "Obrigações da ACURA BRASIL e INFO8",
      "en": "ACURA BRASIL and INFO8 obligations",
      "es": "Obligaciones de ACURA BRASIL e INFO8"
    },
    "content": {
      "pt": "ACURA BRASIL e INFO8 devem oferecer orientação operacional, comunicar resultados com transparéncia em acurabrasil.org/transparencia e manter regras claras de uso da plataforma. Não há exigéncia de carga fixa, número mínimo de consultas ou metas de quota.",
      "en": "ACURA BRASIL and INFO8 must provide operational guidance, publish transparency information at acurabrasil.org/transparencia, and keep clear platform rules. There are no fixed schedule quotas, minimum appointment counts, or mandatory targets.",
      "es": "ACURA BRASIL e INFO8 deben ofrecer orientación operativa, comunicar resultados con transparencia en acurabrasil.org/transparencia y mantener reglas claras de uso de la plataforma. No hay exigencia de carga fija, cantidad mínima de consultas ni metas de cuota."
    }
  },
  {
    "title": {
      "pt": "Responsabilidade profissional",
      "en": "Professional responsibility",
      "es": "Responsabilidad profesional"
    },
    "content": {
      "pt": "A responsabilidade clínica e ética pelo atendimento voluntário é exclusiva do profissional. O programa não substitui serviços de urgência e emergência e pode ter limitações adicionais em campanhas internacionais, conforme licenças e regras locais.",
      "en": "Clinical and ethical responsibility for volunteer care belongs solely to the professional. The program does not replace emergency services and may include additional limits for international campaigns, depending on local licensing and rules.",
      "es": "La responsabilidad clínica y ética por la atención voluntaria es exclusiva del profesional. El programa no reemplaza servicios de urgencia o emergencia y puede tener limitaciones adicionales en campañas internacionales, según licencias y reglas locales."
    }
  },
  {
    "title": {
      "pt": "LGPD",
      "en": "LGPD and data privacy",
      "es": "Proteccin de datos (LGPD)"
    },
    "content": {
      "pt": "Dados pessoais e sensíveis dos pacientes devem ser usados apenas para finalidade assistencial, com confidencialidade e sigilo profissional, em conformidade com a LGPD. Incidentes de segurança ou privacidade devem ser reportados imediatamente pelos canais oficiais.",
      "en": "Personal and sensitive patient data must be used only for care purposes, with confidentiality and professional secrecy, in accordance with LGPD. Security or privacy incidents must be reported immediately through official channels.",
      "es": "Los datos personales y sensibles de los pacientes deben usarse solo para fines asistenciales, con confidencialidad y secreto profesional, de acuerdo con la LGPD. Los incidentes de seguridad o privacidad deben reportarse de inmediato por los canales oficiales."
    }
  },
  {
    "title": {
      "pt": "Vigéncia, aceite e rescisão",
      "en": "Term, acceptance, and termination",
      "es": "Vigencia, aceptación y rescisión"
    },
    "content": {
      "pt": "A vigéncia inicia no aceite digital ao habilitar o checkbox, conforme art. 2 da Lei 9.608/1998. Alterações deste termo serão notificadas; qualquer parte pode rescindir a adesão a qualquer tempo, ficando eleito o foro de Belo Horizonte/MG, com contato em acurabrasil.org/contato.",
      "en": "Validity starts upon digital acceptance by enabling the checkbox, under article 2 of Law 9.608/1998. Changes will be notified; either party may terminate adhesion at any time, and venue is Belo Horizonte/MG, with contact at acurabrasil.org/contato.",
      "es": "La vigencia inicia con la aceptación digital al habilitar el checkbox, conforme al art. 2 de la Ley 9.608/1998. Las modificaciones serán notificadas; cualquier parte puede rescindir la adhesión en cualquier momento, con foro en Belo Horizonte/MG y contacto en acurabrasil.org/contato."
    }
  }
];
