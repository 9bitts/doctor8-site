// Termo de Adesão ao Serviço Voluntário AcuraBrasil — Lei nº 9.608/1998

export const ACURA_VOLUNTEER_TERMS_VERSION = "1.1";
export const ACURA_VOLUNTEER_TERMS_LAST_UPDATED = "15/07/2026";

export type AcuraVolunteerTermsSection = {
  title: { pt: string; en: string; es: string };
  content: { pt: string; en: string; es: string };
};

export const ACURA_VOLUNTEER_TERMS_SECTIONS: AcuraVolunteerTermsSection[] = [
  {
    title: {
      pt: "1. Identificação e objeto",
      en: "1. Identification and purpose",
      es: "1. Identificación y objeto",
    },
    content: {
      pt: `<p>O presente <strong>Termo de Adesão ao Serviço Voluntário</strong> é celebrado entre a <strong>ACURA BRASIL</strong>, Organização da Sociedade Civil de Interesse Público (OSCIP), inscrita no CNPJ sob o nº 30.350.850/0001-80, com sede em Belo Horizonte/MG, e a <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, inscrita no CNPJ sob o nº 20.251.527/0001-04, operadora da plataforma <strong>Doctor8</strong>, doravante denominadas, em conjunto, <strong>Organizadoras</strong>.</p>
      <p class="mt-2">Este termo regula a adesão de profissionais de saúde habilitados ao <strong>Programa Selo Voluntário AcuraBrasil</strong>, destinado a viabilizar, por meio da plataforma Doctor8, o atendimento gratuito a pacientes em situação de vulnerabilidade social, em campanhas humanitárias e demais iniciativas solidárias promovidas pela ACURA BRASIL.</p>
      <p class="mt-2">A adesão é facultativa, individual e não cria vínculo empregatício entre o profissional e as Organizadoras, nos termos da Lei nº 9.608/1998.</p>`,
      en: `<p>This <strong>Volunteer Service Adhesion Agreement</strong> is entered into by <strong>ACURA BRASIL</strong>, a Brazilian Public Interest Civil Society Organization (OSCIP), Tax ID 30.350.850/0001-80, based in Belo Horizonte/MG, and <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, Tax ID 20.251.527/0001-04, operator of the <strong>Doctor8</strong> platform, jointly referred to as the <strong>Organizers</strong>.</p>
      <p class="mt-2">This agreement governs the adhesion of licensed healthcare professionals to the <strong>AcuraBrasil Volunteer Seal Program</strong>, which enables free care for socially vulnerable patients through the Doctor8 platform, within humanitarian campaigns and other solidarity initiatives promoted by ACURA BRASIL.</p>
      <p class="mt-2">Adhesion is voluntary, individual, and does not create an employment relationship between the professional and the Organizers, pursuant to Law 9.608/1998.</p>`,
      es: `<p>El presente <strong>Término de Adhesión al Servicio Voluntario</strong> se celebra entre <strong>ACURA BRASIL</strong>, Organización de la Sociedad Civil de Interés Público (OSCIP), CNPJ 30.350.850/0001-80, con sede en Belo Horizonte/MG, e <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, CNPJ 20.251.527/0001-04, operadora de la plataforma <strong>Doctor8</strong>, en adelante las <strong>Organizadoras</strong>.</p>
      <p class="mt-2">Este término regula la adhesión de profesionales de la salud habilitados al <strong>Programa Sello Voluntario AcuraBrasil</strong>, destinado a facilitar, mediante la plataforma Doctor8, la atención gratuita a pacientes en situación de vulnerabilidad social, en campañas humanitarias e iniciativas solidarias promovidas por ACURA BRASIL.</p>
      <p class="mt-2">La adhesión es facultativa, individual y no crea vínculo laboral entre el profesional y las Organizadoras, conforme a la Ley nº 9.608/1998.</p>`,
    },
  },
  {
    title: {
      pt: "2. Fundamentação legal",
      en: "2. Legal framework",
      es: "2. Fundamentación legal",
    },
    content: {
      pt: `<p>Este termo observa, entre outras normas aplicáveis:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Lei nº 9.608/1998</strong> — dispõe sobre o serviço voluntário e prevê o termo de adesão nos arts. 1 e 2;</li>
        <li><strong>Lei nº 13.709/2018 (LGPD)</strong> — proteção de dados pessoais;</li>
        <li><strong>Lei nº 13.989/2020</strong> — telemedicina;</li>
        <li><strong>Resolução CFM nº 2.314/2022</strong> — telemedicina e telessaúde.</li>
      </ul>
      <p class="mt-2">Integram este termo, por referência, os documentos disponíveis em <a href="/terms">/terms</a> (Termos de Uso), <a href="/privacy">/privacy</a> (Política de Privacidade) e <a href="/tcle-telemedicina">/tcle-telemedicina</a> (TCLE de Telemedicina), aplicáveis na medida de sua compatibilidade com a natureza voluntária do programa.</p>`,
      en: `<p>This agreement complies with, among other applicable rules:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Law 9.608/1998</strong> — governs volunteer service and requires an adhesion instrument under articles 1 and 2;</li>
        <li><strong>Law 13.709/2018 (LGPD)</strong> — personal data protection;</li>
        <li><strong>Law 13.989/2020</strong> — telemedicine;</li>
        <li><strong>CFM Resolution 2.314/2022</strong> — telemedicine and telehealth.</li>
      </ul>
      <p class="mt-2">The documents at <a href="/terms">/terms</a> (Terms of Use), <a href="/privacy">/privacy</a> (Privacy Policy), and <a href="/tcle-telemedicina">/tcle-telemedicina</a> (Telemedicine ICF) are incorporated by reference, to the extent compatible with the voluntary nature of this program.</p>`,
      es: `<p>Este término se rige, entre otras normas aplicables, por:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Ley nº 9.608/1998</strong> — servicio voluntario y acuerdo de adhesión (arts. 1 y 2);</li>
        <li><strong>Ley nº 13.709/2018 (LGPD)</strong> — protección de datos personales;</li>
        <li><strong>Ley nº 13.989/2020</strong> — telemedicina;</li>
        <li><strong>Resolución CFM nº 2.314/2022</strong> — telemedicina y telesalud.</li>
      </ul>
      <p class="mt-2">Forman parte de este término, por referencia, los documentos en <a href="/terms">/terms</a> (Términos de Uso), <a href="/privacy">/privacy</a> (Política de Privacidad) y <a href="/tcle-telemedicina">/tcle-telemedicina</a> (TCLE de Telemedicina), en la medida compatible con la naturaleza voluntaria del programa.</p>`,
    },
  },
  {
    title: {
      pt: "3. Definições",
      en: "3. Definitions",
      es: "3. Definiciones",
    },
    content: {
      pt: `<p>Para os fins deste termo, consideram-se:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Atendimento voluntário</strong> — consulta ou sessão clínica prestada sem cobrança ao paciente, no âmbito do programa;</li>
        <li><strong>Horário voluntário</strong> — bloco de disponibilidade identificado na plataforma (bloco verde) reservado exclusivamente a atendimentos voluntários;</li>
        <li><strong>Horário particular</strong> — período de disponibilidade para atendimentos remunerados, configurado fora dos blocos voluntários;</li>
        <li><strong>Selo Voluntário</strong> — identificação visual conferida ao profissional aderente, para uso exclusivo no contexto do programa;</li>
        <li><strong>Rede humanitária AcuraBrasil</strong> — conjunto de profissionais, campanhas e fluxos de cuidado solidário operados ou apoiados pela ACURA BRASIL na plataforma Doctor8.</li>
      </ul>`,
      en: `<p>For the purposes of this agreement:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Volunteer care</strong> — a clinical consultation or session provided at no charge to the patient under this program;</li>
        <li><strong>Volunteer time slot</strong> — an availability block marked on the platform (green block) reserved exclusively for volunteer appointments;</li>
        <li><strong>Private time slot</strong> — availability configured for paid appointments, outside volunteer blocks;</li>
        <li><strong>Volunteer Seal</strong> — visual badge granted to adherent professionals, for exclusive use within the program context;</li>
        <li><strong>AcuraBrasil humanitarian network</strong> — the set of professionals, campaigns, and solidarity care flows operated or supported by ACURA BRASIL on Doctor8.</li>
      </ul>`,
      es: `<p>A los efectos de este término, se entiende por:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Atención voluntaria</strong> — consulta o sesión clínica prestada sin cobro al paciente, en el marco del programa;</li>
        <li><strong>Horario voluntario</strong> — bloque de disponibilidad identificado en la plataforma (bloque verde) reservado exclusivamente a atenciones voluntarias;</li>
        <li><strong>Horario particular</strong> — período de disponibilidad para atenciones remuneradas, configurado fuera de los bloques voluntarios;</li>
        <li><strong>Sello Voluntario</strong> — identificación visual otorgada al profesional adherido, para uso exclusivo en el contexto del programa;</li>
        <li><strong>Red humanitaria AcuraBrasil</strong> — conjunto de profesionales, campañas y flujos de cuidado solidario operados o apoyados por ACURA BRASIL en Doctor8.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "4. Natureza da relação",
      en: "4. Nature of the relationship",
      es: "4. Naturaleza de la relación",
    },
    content: {
      pt: `<p>Nos termos do art. 1º, parágrafo único, da Lei nº 9.608/1998, o serviço voluntário <strong>não gera vínculo empregatício, obrigação trabalhista, previdenciária ou contraprestação financeira</strong> entre o profissional e as Organizadoras.</p>
      <p class="mt-2">É admitido o <strong>modelo híbrido</strong>: o profissional pode, simultaneamente, manter horários particulares remunerados e horários voluntários, desde que respeitadas as regras de separação entre ambos na plataforma.</p>
      <p class="mt-2">A INFO8 atua exclusivamente como <strong>intermediadora tecnológica</strong>, disponibilizando infraestrutura de agendamento, prontuário eletrônico e comunicação. A ACURA BRASIL atua como <strong>instituição promotora</strong> do programa de voluntariado, sem exercer direção técnica sobre o ato clínico.</p>`,
      en: `<p>Under article 1, sole paragraph, of Law 9.608/1998, volunteer service <strong>does not create an employment relationship, labor or social security obligations, or financial compensation</strong> between the professional and the Organizers.</p>
      <p class="mt-2">A <strong>hybrid model</strong> is permitted: the professional may simultaneously maintain paid private slots and volunteer slots, provided the platform rules for keeping both separate are observed.</p>
      <p class="mt-2">INFO8 acts solely as a <strong>technology intermediary</strong>, providing scheduling, electronic health record, and communication infrastructure. ACURA BRASIL acts as the <strong>promoting institution</strong> of the volunteer program, without directing the clinical act.</p>`,
      es: `<p>Conforme al art. 1º, párrafo único, de la Ley nº 9.608/1998, el servicio voluntario <strong>no genera vínculo laboral, obligaciones de empleo o seguridad social, ni contraprestación financiera</strong> entre el profesional y las Organizadoras.</p>
      <p class="mt-2">Se admite un <strong>modelo híbrido</strong>: el profesional puede mantener simultáneamente horarios particulares remunerados y horarios voluntarios, respetando las reglas de separación en la plataforma.</p>
      <p class="mt-2">INFO8 actúa exclusivamente como <strong>intermediaria tecnológica</strong>, proporcionando infraestructura de agenda, historia clínica electrónica y comunicación. ACURA BRASIL actúa como <strong>institución promotora</strong> del programa, sin ejercer dirección técnica sobre el acto clínico.</p>`,
    },
  },
  {
    title: {
      pt: "5. Adesão e funcionamento na plataforma",
      en: "5. Adhesion and platform operation",
      es: "5. Adhesión y funcionamiento en la plataforma",
    },
    content: {
      pt: `<p>Para aderir ao programa e manter-se ativo, o profissional deve:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>possuir conta verificada na plataforma Doctor8, com registro profissional ativo e válido;</li>
        <li>aceitar expressamente este termo, mediante marcação do checkbox <strong>"Sou voluntário AcuraBrasil"</strong>;</li>
        <li>configurar, em sua agenda, blocos de disponibilidade voluntária (blocos verdes), quando desejar ofertar atendimentos gratuitos;</li>
        <li>observar que atendimentos particulares permanecem sujeitos a cobrança e devem ser agendados fora dos horários voluntários.</li>
      </ul>
      <p class="mt-2">A habilitação do selo e a visibilidade como voluntário dependem da verificação cadastral e do cumprimento das regras deste termo.</p>`,
      en: `<p>To join and remain active in the program, the professional must:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>hold a verified Doctor8 account with an active, valid professional license;</li>
        <li>expressly accept this agreement by enabling the checkbox <strong>"I am an AcuraBrasil volunteer"</strong>;</li>
        <li>configure volunteer availability blocks (green blocks) in their schedule when offering free appointments;</li>
        <li>ensure that private appointments remain paid and are booked outside volunteer time slots.</li>
      </ul>
      <p class="mt-2">Badge eligibility and visibility as a volunteer depend on account verification and compliance with this agreement.</p>`,
      es: `<p>Para adherirse al programa y mantenerse activo, el profesional debe:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>contar con cuenta verificada en Doctor8 y licencia profesional activa y válida;</li>
        <li>aceptar expresamente este término, activando el checkbox <strong>"Soy voluntario AcuraBrasil"</strong>;</li>
        <li>configurar bloques de disponibilidad voluntaria (bloques verdes) en su agenda, cuando desee ofrecer atenciones gratuitas;</li>
        <li>observar que las consultas particulares siguen siendo remuneradas y deben agendarse fuera de los horarios voluntarios.</li>
      </ul>
      <p class="mt-2">La habilitación del sello y la visibilidad como voluntario dependen de la verificación del registro y del cumplimiento de este término.</p>`,
    },
  },
  {
    title: {
      pt: "6. Obrigações do voluntário",
      en: "6. Volunteer obligations",
      es: "6. Obligaciones del voluntario",
    },
    content: {
      pt: `<p>O profissional aderente compromete-se a:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>atuar com <strong>ética, diligência e competência</strong>, observando as normas de sua categoria profissional e conselho de classe;</li>
        <li>manter registro profissional ativo e informar prontamente qualquer suspensão ou impedimento;</li>
        <li>cumprir pontualmente os horários voluntários configurados e os agendamentos confirmados;</li>
        <li><strong>não cobrar</strong>, direta ou indiretamente, valores de pacientes atendidos em horário voluntário;</li>
        <li>registrar adequadamente cada atendimento no prontuário eletrônico da plataforma;</li>
        <li>identificar e encaminhar casos de urgência ou emergência para serviços presenciais competentes;</li>
        <li>utilizar o Selo Voluntário apenas no contexto autorizado, sem associação indevida ou publicidade enganosa;</li>
        <li>tratar dados pessoais e sensíveis dos pacientes com confidencialidade, conforme a seção 10 deste termo.</li>
      </ul>`,
      en: `<p>The adherent professional agrees to:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>practice with <strong>ethics, diligence, and competence</strong>, observing applicable professional and licensing rules;</li>
        <li>maintain an active professional license and promptly report any suspension or disqualification;</li>
        <li>honor configured volunteer time slots and confirmed appointments;</li>
        <li><strong>not charge</strong> patients, directly or indirectly, for care provided in volunteer slots;</li>
        <li>properly document each appointment in the platform's electronic health record;</li>
        <li>identify and refer urgent or emergency cases to appropriate in-person services;</li>
        <li>use the Volunteer Seal only in authorized contexts, without misleading association or advertising;</li>
        <li>handle personal and sensitive patient data confidentially, as set out in section 10 of this agreement.</li>
      </ul>`,
      es: `<p>El profesional adherido se compromete a:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>actuar con <strong>ética, diligencia y competencia</strong>, observando las normas de su categoría profesional y colegio;</li>
        <li>mantener licencia profesional activa e informar de inmediato cualquier suspensión o impedimento;</li>
        <li>cumplir puntualmente los horarios voluntarios configurados y las citas confirmadas;</li>
        <li><strong>no cobrar</strong>, directa o indirectamente, a pacientes atendidos en horario voluntario;</li>
        <li>registrar adecuadamente cada atención en la historia clínica electrónica de la plataforma;</li>
        <li>identificar y derivar casos de urgencia o emergencia a servicios presenciales competentes;</li>
        <li>utilizar el Sello Voluntario solo en el contexto autorizado, sin asociación indebida ni publicidad engañosa;</li>
        <li>tratar datos personales y sensibles de los pacientes con confidencialidad, conforme a la sección 10 de este término.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "7. Direitos do voluntário",
      en: "7. Volunteer rights",
      es: "7. Derechos del voluntario",
    },
    content: {
      pt: `<p>São direitos do profissional aderente:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>receber informações sobre campanhas, orientações operacionais e atualizações do programa;</li>
        <li>utilizar a infraestrutura da plataforma Doctor8 para a prestação dos atendimentos voluntários;</li>
        <li>exibir o Selo Voluntário AcuraBrasil em seu perfil e nos contextos autorizados pelo programa;</li>
        <li>obter <strong>reembolso de despesas</strong> diretamente relacionadas ao serviço voluntário, quando previamente autorizadas pela ACURA BRASIL, nos termos do art. 3º da Lei nº 9.608/1998;</li>
        <li><strong>retirar-se do programa a qualquer tempo</strong>, mediante desmarcação do checkbox de adesão, sem penalidade;</li>
        <li>ter seus dados pessoais tratados em conformidade com a LGPD e a Política de Privacidade da Doctor8.</li>
      </ul>`,
      en: `<p>The adherent professional is entitled to:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>receive information about campaigns, operational guidance, and program updates;</li>
        <li>use the Doctor8 platform infrastructure to deliver volunteer appointments;</li>
        <li>display the AcuraBrasil Volunteer Seal on their profile and in program-authorized contexts;</li>
        <li>obtain <strong>reimbursement of expenses</strong> directly related to volunteer service, when pre-authorized by ACURA BRASIL, under article 3 of Law 9.608/1998;</li>
        <li><strong>withdraw from the program at any time</strong> by disabling the adhesion checkbox, without penalty;</li>
        <li>have their personal data processed in accordance with LGPD and Doctor8's Privacy Policy.</li>
      </ul>`,
      es: `<p>Son derechos del profesional adherido:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>recibir información sobre campañas, orientaciones operativas y actualizaciones del programa;</li>
        <li>utilizar la infraestructura de la plataforma Doctor8 para las atenciones voluntarias;</li>
        <li>exhibir el Sello Voluntario AcuraBrasil en su perfil y en los contextos autorizados;</li>
        <li>obtener <strong>reembolso de gastos</strong> directamente relacionados con el servicio voluntario, cuando sean previamente autorizados por ACURA BRASIL, conforme al art. 3º de la Ley nº 9.608/1998;</li>
        <li><strong>retirarse del programa en cualquier momento</strong>, desactivando el checkbox de adhesión, sin penalidad;</li>
        <li>que sus datos personales sean tratados conforme a la LGPD y la Política de Privacidad de Doctor8.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "8. Obrigações das Organizadoras",
      en: "8. Organizers' obligations",
      es: "8. Obligaciones de las Organizadoras",
    },
    content: {
      pt: `<p>A ACURA BRASIL e a INFO8 comprometem-se a:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>disponibilizar orientação operacional e suporte técnico razoável para a participação no programa;</li>
        <li>comunicar resultados e informações de transparência em <a href="https://acurabrasil.org/transparencia" target="_blank" rel="noopener noreferrer">acurabrasil.org/transparencia</a>;</li>
        <li>manter regras claras de uso da plataforma e deste termo, com comunicação prévia sobre alterações relevantes;</li>
        <li>preservar a distinção entre horários voluntários e particulares na interface da plataforma.</li>
      </ul>
      <p class="mt-2">As Organizadoras <strong>não exigem</strong> carga horária mínima, número fixo de consultas, metas de quota ou permanência mínima no programa.</p>`,
      en: `<p>ACURA BRASIL and INFO8 agree to:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>provide operational guidance and reasonable technical support for program participation;</li>
        <li>publish results and transparency information at <a href="https://acurabrasil.org/transparencia" target="_blank" rel="noopener noreferrer">acurabrasil.org/transparencia</a>;</li>
        <li>maintain clear platform rules and terms of this agreement, with prior notice of material changes;</li>
        <li>preserve the distinction between volunteer and private time slots in the platform interface.</li>
      </ul>
      <p class="mt-2">The Organizers <strong>do not require</strong> minimum hours, fixed appointment counts, quota targets, or minimum program tenure.</p>`,
      es: `<p>ACURA BRASIL e INFO8 se comprometen a:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>brindar orientación operativa y soporte técnico razonable para la participación en el programa;</li>
        <li>comunicar resultados e información de transparencia en <a href="https://acurabrasil.org/transparencia" target="_blank" rel="noopener noreferrer">acurabrasil.org/transparencia</a>;</li>
        <li>mantener reglas claras de uso de la plataforma y de este término, con aviso previo de cambios relevantes;</li>
        <li>preservar la distinción entre horarios voluntarios y particulares en la interfaz de la plataforma.</li>
      </ul>
      <p class="mt-2">Las Organizadoras <strong>no exigen</strong> carga horaria mínima, número fijo de consultas, metas de cuota ni permanencia mínima en el programa.</p>`,
    },
  },
  {
    title: {
      pt: "9. Responsabilidade profissional",
      en: "9. Professional responsibility",
      es: "9. Responsabilidad profesional",
    },
    content: {
      pt: `<p>A <strong>responsabilidade clínica, técnica e ética</strong> pelos atendimentos voluntários é <strong>exclusiva do profissional</strong> que os presta, incluindo diagnóstico, conduta, prescrição (quando aplicável) e registro em prontuário.</p>
      <p class="mt-2">O programa de voluntariado <strong>não substitui</strong> serviços de urgência, emergência ou atenção primária presencial. Em situações de risco iminente, o profissional deve orientar o paciente a buscar atendimento presencial imediato.</p>
      <p class="mt-2">Em campanhas internacionais ou transfronteiriças, podem aplicar-se limitações adicionais conforme licenças profissionais, normas locais e regras específicas de cada campanha, divulgadas previamente aos participantes.</p>`,
      en: `<p><strong>Clinical, technical, and ethical responsibility</strong> for volunteer appointments rests <strong>solely with the professional</strong> who provides them, including diagnosis, conduct, prescription (when applicable), and medical record documentation.</p>
      <p class="mt-2">The volunteer program <strong>does not replace</strong> emergency services or in-person primary care. In life-threatening situations, the professional must direct the patient to immediate in-person care.</p>
      <p class="mt-2">International or cross-border campaigns may involve additional limitations based on professional licensing, local rules, and campaign-specific requirements disclosed to participants in advance.</p>`,
      es: `<p>La <strong>responsabilidad clínica, técnica y ética</strong> de las atenciones voluntarias es <strong>exclusiva del profesional</strong> que las presta, incluyendo diagnóstico, conducta, prescripción (cuando corresponda) y registro en historia clínica.</p>
      <p class="mt-2">El programa de voluntariado <strong>no reemplaza</strong> servicios de urgencia, emergencia o atención primaria presencial. En situaciones de riesgo inminente, el profesional debe orientar al paciente a buscar atención presencial inmediata.</p>
      <p class="mt-2">En campañas internacionales o transfronterizas pueden aplicarse limitaciones adicionales según licencias profesionales, normas locales y reglas específicas de cada campaña, divulgadas previamente a los participantes.</p>`,
    },
  },
  {
    title: {
      pt: "10. Proteção de dados (LGPD)",
      en: "10. Data protection (LGPD)",
      es: "10. Protección de datos (LGPD)",
    },
    content: {
      pt: `<p>Dados pessoais e sensíveis de pacientes tratados no âmbito do programa devem ser utilizados <strong>exclusivamente para finalidade assistencial</strong>, com confidencialidade, sigilo profissional e observância da Lei nº 13.709/2018 (LGPD).</p>
      <p class="mt-2">O profissional não deve copiar, exportar ou compartilhar prontuários ou dados de pacientes fora dos fluxos autorizados pela plataforma, salvo obrigação legal ou consentimento válido do titular.</p>
      <p class="mt-2">Incidentes de segurança ou privacidade devem ser reportados <strong>imediatamente</strong> pelos canais oficiais de suporte da Doctor8 e, quando aplicável, à ACURA BRASIL.</p>`,
      en: `<p>Personal and sensitive patient data processed under this program must be used <strong>exclusively for care purposes</strong>, with confidentiality, professional secrecy, and compliance with Law 13.709/2018 (LGPD).</p>
      <p class="mt-2">The professional must not copy, export, or share patient records or data outside platform-authorized flows, except where required by law or with valid data-subject consent.</p>
      <p class="mt-2">Security or privacy incidents must be reported <strong>immediately</strong> through Doctor8's official support channels and, when applicable, to ACURA BRASIL.</p>`,
      es: `<p>Los datos personales y sensibles de pacientes tratados en el marco del programa deben utilizarse <strong>exclusivamente con fines asistenciales</strong>, con confidencialidad, secreto profesional y observancia de la Ley nº 13.709/2018 (LGPD).</p>
      <p class="mt-2">El profesional no debe copiar, exportar ni compartir historias clínicas o datos de pacientes fuera de los flujos autorizados por la plataforma, salvo obligación legal o consentimiento válido del titular.</p>
      <p class="mt-2">Los incidentes de seguridad o privacidad deben reportarse <strong>de inmediato</strong> por los canales oficiales de soporte de Doctor8 y, cuando corresponda, a ACURA BRASIL.</p>`,
    },
  },
  {
    title: {
      pt: "11. Vigência, aceite e rescisão",
      en: "11. Term, acceptance, and termination",
      es: "11. Vigencia, aceptación y rescisión",
    },
    content: {
      pt: `<p>A vigência deste termo inicia na data do <strong>aceite digital</strong>, registrado ao habilitar o checkbox de adesão ao programa, nos termos do art. 2º da Lei nº 9.608/1998.</p>
      <p class="mt-2">Alterações relevantes deste termo serão comunicadas com antecedência razoável. A continuidade da adesão após a notificação implica concordância com a versão atualizada, salvo exercício do direito de rescisão.</p>
      <p class="mt-2">Qualquer das partes pode <strong>rescindir a adesão a qualquer tempo</strong>, sem necessidade de justificativa. O profissional pode rescindir desmarcando o checkbox; as Organizadoras podem suspender ou encerrar a adesão em caso de violação deste termo ou das normas aplicáveis.</p>
      <p class="mt-2">Fica eleito o foro da comarca de <strong>Belo Horizonte/MG</strong> para dirimir controvérsias decorrentes deste termo. Dúvidas ou comunicações podem ser encaminhadas a <a href="https://acurabrasil.org/contato" target="_blank" rel="noopener noreferrer">acurabrasil.org/contato</a>.</p>`,
      en: `<p>This agreement takes effect on the date of <strong>digital acceptance</strong>, recorded when the program adhesion checkbox is enabled, under article 2 of Law 9.608/1998.</p>
      <p class="mt-2">Material changes will be communicated with reasonable advance notice. Continued participation after notification implies acceptance of the updated version, unless the right to terminate is exercised.</p>
      <p class="mt-2">Either party may <strong>terminate adhesion at any time</strong>, without justification. The professional may terminate by disabling the checkbox; the Organizers may suspend or end adhesion in case of breach of this agreement or applicable rules.</p>
      <p class="mt-2">The courts of <strong>Belo Horizonte/MG</strong> are elected as the venue for disputes arising from this agreement. Questions or communications may be sent to <a href="https://acurabrasil.org/contato" target="_blank" rel="noopener noreferrer">acurabrasil.org/contato</a>.</p>`,
      es: `<p>La vigencia de este término inicia en la fecha de la <strong>aceptación digital</strong>, registrada al activar el checkbox de adhesión al programa, conforme al art. 2º de la Ley nº 9.608/1998.</p>
      <p class="mt-2">Las modificaciones relevantes serán comunicadas con antelación razonable. La continuidad de la adhesión tras la notificación implica conformidad con la versión actualizada, salvo ejercicio del derecho de rescisión.</p>
      <p class="mt-2">Cualquiera de las partes puede <strong>rescindir la adhesión en cualquier momento</strong>, sin necesidad de justificación. El profesional puede rescindir desactivando el checkbox; las Organizadoras pueden suspender o finalizar la adhesión en caso de incumplimiento de este término o de las normas aplicables.</p>
      <p class="mt-2">Se elige el fuero de la comarca de <strong>Belo Horizonte/MG</strong> para dirimir controversias derivadas de este término. Consultas o comunicaciones pueden enviarse a <a href="https://acurabrasil.org/contato" target="_blank" rel="noopener noreferrer">acurabrasil.org/contato</a>.</p>`,
    },
  },
];
