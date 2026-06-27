// TCLE ? Termo de Consentimento Livre e Esclarecido para Telemedicina / Teleconsulta
// Versioned document ? update TELEMEDICINE_TCLE_VERSION when content changes materially.

export const TELEMEDICINE_TCLE_VERSION = "1.0";

export const TELEMEDICINE_TCLE_LAST_UPDATED = "27/06/2026";

export type TcleSection = {
  title: { pt: string; en: string; es: string };
  content: { pt: string; en: string; es: string };
};

export const TELEMEDICINE_TCLE_SECTIONS: TcleSection[] = [
  {
    title: {
      pt: "1. Identifica\u00e7\u00e3o e finalidade",
      en: "1. Identification and purpose",
      es: "1. Identificaci\u00f3n y finalidad",
    },
    content: {
      pt: `<p>Este Termo de Consentimento Livre e Esclarecido (TCLE) refere-se ao <strong>atendimento em sa\u00fade a dist\u00e2ncia</strong> (telemedicina/teleconsulta) oferecido por profissionais de sa\u00fade por meio da plataforma <strong>Doctor8</strong>, operada pela INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (CNPJ 20.251.527/0001-04).</p>
      <p class="mt-2">A teleconsulta utiliza tecnologias de comunica\u00e7\u00e3o segura (v\u00eddeo, \u00e1udio e/ou mensagens) para avalia\u00e7\u00e3o cl\u00ednica, orienta\u00e7\u00e3o, acompanhamento ou encaminhamento, conforme a natureza do atendimento e a regula\u00e7\u00e3o aplic\u00e1vel, incluindo a Resolu\u00e7\u00e3o CFM n\u00ba 2.314/2022 e a Lei n\u00ba 13.989/2020.</p>`,
      en: `<p>This Free and Informed Consent Form (ICF) applies to <strong>remote healthcare services</strong> (telemedicine/teleconsultation) provided by licensed health professionals through the <strong>Doctor8</strong> platform, operated by INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA.</p>
      <p class="mt-2">Teleconsultation uses secure communication technologies (video, audio, and/or messaging) for clinical assessment, guidance, follow-up, or referral, as permitted by applicable regulations.</p>`,
      es: `<p>Este T\u00e9rmino de Consentimiento Libre e Informado (TCLI) se refiere a la <strong>atenci\u00f3n en salud a distancia</strong> (telemedicina/teleconsulta) ofrecida por profesionales de la salud a trav\u00e9s de la plataforma <strong>Doctor8</strong>, operada por INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA.</p>
      <p class="mt-2">La teleconsulta utiliza tecnolog\u00edas de comunicaci\u00f3n segura (video, audio y/o mensajes) para evaluaci\u00f3n cl\u00ednica, orientaci\u00f3n, seguimiento o derivaci\u00f3n, conforme a la normativa aplicable.</p>`,
    },
  },
  {
    title: {
      pt: "2. Como funciona o atendimento a dist\u00e2ncia",
      en: "2. How remote care works",
      es: "2. C\u00f3mo funciona la atenci\u00f3n a distancia",
    },
    content: {
      pt: `<ul class="list-disc pl-5 space-y-2">
        <li>Voc\u00ea ser\u00e1 atendido(a) por um profissional de sa\u00fade devidamente habilitado, em ambiente virtual privado na plataforma Doctor8.</li>
        <li>Poder\u00e3o ser solicitadas informa\u00e7\u00f5es sobre sintomas, hist\u00f3rico de sa\u00fade, medicamentos e contexto do atendimento.</li>
        <li>O profissional poder\u00e1 registrar anota\u00e7\u00f5es cl\u00ednicas no seu prontu\u00e1rio eletr\u00f4nico na plataforma, quando aplic\u00e1vel.</li>
        <li>Em situa\u00e7\u00f5es de risco iminente \u00e0 vida, o profissional poder\u00e1 orient\u00e1-lo(a) a buscar atendimento presencial de urg\u00eancia/emerg\u00eancia.</li>
      </ul>`,
      en: `<ul class="list-disc pl-5 space-y-2">
        <li>You will be seen by a duly licensed health professional in a private virtual environment on the Doctor8 platform.</li>
        <li>You may be asked about symptoms, health history, medications, and care context.</li>
        <li>The professional may record clinical notes in your electronic chart on the platform, when applicable.</li>
        <li>In life-threatening situations, the professional may direct you to in-person emergency care.</li>
      </ul>`,
      es: `<ul class="list-disc pl-5 space-y-2">
        <li>Ser\u00e1 atendido(a) por un profesional de la salud debidamente habilitado, en un entorno virtual privado en la plataforma Doctor8.</li>
        <li>Podr\u00e1n solicitarse informaciones sobre s\u00edntomas, historial de salud, medicamentos y contexto de la atenci\u00f3n.</li>
        <li>El profesional podr\u00e1 registrar notas cl\u00ednicas en su historia cl\u00ednica electr\u00f3nica en la plataforma, cuando corresponda.</li>
        <li>En situaciones de riesgo inminente para la vida, el profesional podr\u00e1 orientarle a buscar atenci\u00f3n presencial de urgencia/emergencia.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "3. Benef\u00edcios, limita\u00e7\u00f5es e riscos",
      en: "3. Benefits, limitations, and risks",
      es: "3. Beneficios, limitaciones y riesgos",
    },
    content: {
      pt: `<p><strong>Benef\u00edcios:</strong> acesso mais r\u00e1pido \u00e0 orienta\u00e7\u00e3o profissional, redu\u00e7\u00e3o de deslocamento e continuidade do cuidado em situa\u00e7\u00f5es autorizadas.</p>
      <p class="mt-2"><strong>Limita\u00e7\u00f5es:</strong> o exame f\u00edsico presencial pode ser limitado; a qualidade depende da sua conex\u00e3o de internet, dispositivo e ambiente; nem toda condi\u00e7\u00e3o pode ser resolvida remotamente.</p>
      <p class="mt-2"><strong>Riscos:</strong> falhas t\u00e9cnicas, interrup\u00e7\u00e3o da comunica\u00e7\u00e3o, atraso no diagn\u00f3stico se informa\u00e7\u00f5es incompletas forem fornecidas, ou necessidade de encaminhamento presencial.</p>
      <p class="mt-2"><strong>Alternativas:</strong> atendimento presencial em servi\u00e7os de sa\u00fade, pronto-atendimento ou emerg\u00eancia, conforme a gravidade dos sintomas.</p>`,
      en: `<p><strong>Benefits:</strong> faster access to professional guidance, less travel, and care continuity when remote care is appropriate.</p>
      <p class="mt-2"><strong>Limitations:</strong> in-person physical examination may be limited; quality depends on your internet, device, and environment; not every condition can be managed remotely.</p>
      <p class="mt-2"><strong>Risks:</strong> technical failures, communication interruption, delayed diagnosis if incomplete information is provided, or need for in-person referral.</p>
      <p class="mt-2"><strong>Alternatives:</strong> in-person care at health services, urgent care, or emergency departments, depending on symptom severity.</p>`,
      es: `<p><strong>Beneficios:</strong> acceso m\u00e1s r\u00e1pido a orientaci\u00f3n profesional, menos desplazamiento y continuidad del cuidado cuando la atenci\u00f3n remota es apropiada.</p>
      <p class="mt-2"><strong>Limitaciones:</strong> el examen f\u00edsico presencial puede ser limitado; la calidad depende de su conexi\u00f3n, dispositivo y entorno; no toda condici\u00f3n puede resolverse a distancia.</p>
      <p class="mt-2"><strong>Riesgos:</strong> fallas t\u00e9cnicas, interrupci\u00f3n de la comunicaci\u00f3n, retraso en el diagn\u00f3stico si la informaci\u00f3n es incompleta, o necesidad de derivaci\u00f3n presencial.</p>
      <p class="mt-2"><strong>Alternativas:</strong> atenci\u00f3n presencial en servicios de salud, urgencias o emergencias, seg\u00fan la gravedad.</p>`,
    },
  },
  {
    title: {
      pt: "4. Privacidade e prote\u00e7\u00e3o de dados (LGPD)",
      en: "4. Privacy and data protection",
      es: "4. Privacidad y protecci\u00f3n de datos",
    },
    content: {
      pt: `<p>Seus dados de sa\u00fade s\u00e3o tratados conforme a <a href="/privacy" class="text-emerald-700 underline">Pol\u00edtica de Privacidade</a> e a Lei Geral de Prote\u00e7\u00e3o de Dados (Lei n\u00ba 13.709/2018).</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Informa\u00e7\u00f5es cl\u00ednicas s\u00e3o compartilhadas apenas com o profissional que realiza o atendimento e equipe autorizada.</li>
        <li>Dados sens\u00edveis podem ser criptografados e armazenados com controles de acesso.</li>
        <li>Voc\u00ea pode exercer direitos de acesso, corre\u00e7\u00e3o e outras prerrogativas previstas na LGPD.</li>
      </ul>`,
      en: `<p>Your health data is processed according to our <a href="/privacy" class="text-emerald-700 underline">Privacy Policy</a> and applicable data protection laws.</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Clinical information is shared only with the professional providing care and authorized staff.</li>
        <li>Sensitive data may be encrypted and stored with access controls.</li>
        <li>You may exercise rights of access, correction, and other legal entitlements.</li>
      </ul>`,
      es: `<p>Sus datos de salud se tratan conforme la <a href="/privacy" class="text-emerald-700 underline">Pol\u00edtica de Privacidad</a> y las leyes aplicables de protecci\u00f3n de datos.</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>La informaci\u00f3n cl\u00ednica se comparte solo con el profesional que atiende y personal autorizado.</li>
        <li>Los datos sensibles pueden cifrarse y almacenarse con controles de acceso.</li>
        <li>Puede ejercer derechos de acceso, correcci\u00f3n y otras prerrogativas legales.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "5. Grava\u00e7\u00e3o e documenta\u00e7\u00e3o",
      en: "5. Recording and documentation",
      es: "5. Grabaci\u00f3n y documentaci\u00f3n",
    },
    content: {
      pt: `<p>A consulta por v\u00eddeo na Doctor8 <strong>n\u00e3o \u00e9 gravada automaticamente</strong> pela plataforma, salvo quando houver consentimento espec\u00edfico e separado para grava\u00e7\u00e3o de \u00e1udio com finalidade de aux\u00edlio \u00e0 documenta\u00e7\u00e3o cl\u00ednica, informado pelo profissional durante o atendimento.</p>
      <p class="mt-2">Anota\u00e7\u00f5es cl\u00ednicas feitas pelo profissional constituem parte do prontu\u00e1rio e seguem as normas \u00e9ticas e legais aplic\u00e1veis.</p>`,
      en: `<p>Video consultations on Doctor8 are <strong>not automatically recorded</strong> by the platform, unless separate specific consent is given for audio recording to assist clinical documentation, as explained by the professional during the visit.</p>
      <p class="mt-2">Clinical notes made by the professional form part of the medical record and follow applicable ethical and legal standards.</p>`,
      es: `<p>Las consultas por video en Doctor8 <strong>no se graban autom\u00e1ticamente</strong> en la plataforma, salvo consentimiento espec\u00edfico y separado para grabaci\u00f3n de audio con fines de documentaci\u00f3n cl\u00ednica, informado por el profesional durante la atenci\u00f3n.</p>
      <p class="mt-2">Las notas cl\u00ednicas del profesional forman parte de la historia cl\u00ednica y siguen las normas \u00e9ticas y legales aplicables.</p>`,
    },
  },
  {
    title: {
      pt: "6. Consentimento livre, esclarecido e revog\u00e1vel",
      en: "6. Free, informed, and revocable consent",
      es: "6. Consentimiento libre, informado y revocable",
    },
    content: {
      pt: `<ul class="list-disc pl-5 space-y-2">
        <li>Declaro que li (ou tive oportunidade de ler) este termo, compreendi suas informa\u00e7\u00f5es e tive oportunidade de fazer perguntas.</li>
        <li>Autorizo o atendimento em sa\u00fade a dist\u00e2ncia nas condi\u00e7\u00f5es descritas.</li>
        <li>Entendo que posso recusar ou interromper o atendimento a qualquer momento, sem preju\u00edzo de outros cuidados.</li>
        <li>Entendo que este consentimento pode ser revogado, observadas as obriga\u00e7\u00f5es legais de guarda de prontu\u00e1rio j\u00e1 produzido.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">D\u00favidas: support@doctor8.org \u00b7 Encarregado de dados (DPO): conforme <a href="/privacy" class="underline">Pol\u00edtica de Privacidade</a>.</p>`,
      en: `<ul class="list-disc pl-5 space-y-2">
        <li>I declare that I have read (or had the opportunity to read) this form, understood its information, and had the opportunity to ask questions.</li>
        <li>I authorize remote healthcare under the conditions described.</li>
        <li>I understand I may refuse or stop the visit at any time without losing access to other care options.</li>
        <li>I understand this consent may be revoked, subject to legal obligations regarding records already created.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">Questions: support@doctor8.org \u00b7 Data protection contact: see <a href="/privacy" class="underline">Privacy Policy</a>.</p>`,
      es: `<ul class="list-disc pl-5 space-y-2">
        <li>Declaro que le\u00ed (o tuve oportunidad de leer) este t\u00e9rmino, comprend\u00ed su informaci\u00f3n y pude hacer preguntas.</li>
        <li>Autorizo la atenci\u00f3n en salud a distancia en las condiciones descritas.</li>
        <li>Entiendo que puedo rechazar o interrumpir la atenci\u00f3n en cualquier momento.</li>
        <li>Entiendo que este consentimiento puede revocarse, observadas las obligaciones legales sobre registros ya producidos.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">Consultas: support@doctor8.org \u00b7 Protecci\u00f3n de datos: ver <a href="/privacy" class="underline">Pol\u00edtica de Privacidad</a>.</p>`,
    },
  },
];
