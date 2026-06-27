// TCLE - Termo de Consentimento Livre e Esclarecido para Telemedicina / Teleconsulta
// Versioned document - update TELEMEDICINE_TCLE_VERSION when content changes materially.

export const TELEMEDICINE_TCLE_VERSION = "1.1";

export const TELEMEDICINE_TCLE_LAST_UPDATED = "27/06/2026";

export type TcleSection = {
  title: { pt: string; en: string; es: string };
  content: { pt: string; en: string; es: string };
};

export const TELEMEDICINE_TCLE_SECTIONS: TcleSection[] = [
  {
    title: {
      pt: "1. Identificação e finalidade",
      en: "1. Identification and purpose",
      es: "1. Identificación y finalidad",
    },
    content: {
      pt: `<p>Este Termo de Consentimento Livre e Esclarecido (TCLE) autoriza o <strong>atendimento em saúde a distância</strong> (telemedicina/teleconsulta) realizado por profissionais de saúde habilitados por meio da plataforma <strong>Doctor8</strong>, operada pela INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (CNPJ 20.251.527/0001-04).</p>
      <p class="mt-2">O atendimento utiliza tecnologias de comunicação segura — vídeo, áudio e/ou mensagens — para avaliação clínica, orientação, acompanhamento ou encaminhamento, conforme a natureza do caso e a legislação aplicável, incluindo a Resolução CFM nº 2.314/2022 e a Lei nº 13.989/2020.</p>
      <p class="mt-2">Em campanhas humanitárias (como apoio a vítimas de desastres), o atendimento pode ser <strong>gratuito</strong> e organizado em filas de voluntários. Mesmo nesses casos, aplicam-se as mesmas regras de confidencialidade, registro em prontuário e proteção de dados descritas neste termo.</p>`,
      en: `<p>This Free and Informed Consent Form (ICF) authorizes <strong>remote healthcare services</strong> (telemedicine/teleconsultation) provided by licensed health professionals through the <strong>Doctor8</strong> platform, operated by INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA.</p>
      <p class="mt-2">Care uses secure communication technologies — video, audio, and/or messaging — for clinical assessment, guidance, follow-up, or referral, as permitted by applicable law and professional regulations.</p>
      <p class="mt-2">In humanitarian campaigns (such as disaster relief), care may be <strong>free of charge</strong> and delivered through volunteer queues. The same confidentiality, medical record, and data protection rules in this form still apply.</p>`,
      es: `<p>Este Término de Consentimiento Libre e Informado (TCLI) autoriza la <strong>atención en salud a distancia</strong> (telemedicina/teleconsulta) brindada por profesionales de la salud habilitados a través de la plataforma <strong>Doctor8</strong>, operada por INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA.</p>
      <p class="mt-2">La atención utiliza tecnologías de comunicación segura — video, audio y/o mensajes — para evaluación clínica, orientación, seguimiento o derivación, conforme a la normativa aplicable.</p>
      <p class="mt-2">En campañas humanitarias (como apoyo a víctimas de desastres), la atención puede ser <strong>gratuita</strong> y organizada en filas de voluntarios. En todos los casos aplican las mismas reglas de confidencialidad, historial clínico y protección de datos de este término.</p>`,
    },
  },
  {
    title: {
      pt: "2. Como funciona o atendimento",
      en: "2. How care works",
      es: "2. Cómo funciona la atención",
    },
    content: {
      pt: `<ul class="list-disc pl-5 space-y-2">
        <li>Você será atendido(a) por um <strong>profissional de saúde habilitado</strong>, em ambiente virtual privado na plataforma Doctor8.</li>
        <li>Podem ser solicitadas informações sobre sintomas, histórico de saúde, medicamentos, situação de moradia e contexto da emergência, quando aplicável.</li>
        <li>O profissional poderá registrar anotações clínicas no seu prontuário eletrônico na plataforma.</li>
        <li>Após a consulta, <strong>voluntários de acompanhamento</strong> (chamados <strong>Anjos</strong>) podem entrar em contato para saber como você está e se precisa de ajuda — conforme a seção 5 deste termo.</li>
        <li>Em risco iminente à vida, o profissional orientará busca de atendimento presencial de urgência ou emergência.</li>
      </ul>`,
      en: `<ul class="list-disc pl-5 space-y-2">
        <li>You will be seen by a <strong>licensed health professional</strong> in a private virtual environment on Doctor8.</li>
        <li>You may be asked about symptoms, health history, medications, housing situation, and emergency context, when relevant.</li>
        <li>The professional may record clinical notes in your electronic chart on the platform.</li>
        <li>After your visit, <strong>lay follow-up volunteers</strong> (called <strong>Angels</strong>) may contact you to check how you are doing and whether you need help — as described in section 5 of this form.</li>
        <li>In life-threatening situations, the professional will direct you to in-person emergency care.</li>
      </ul>`,
      es: `<ul class="list-disc pl-5 space-y-2">
        <li>Será atendido(a) por un <strong>profesional de la salud habilitado</strong>, en un entorno virtual privado en Doctor8.</li>
        <li>Podrán solicitarse datos sobre síntomas, historial de salud, medicamentos, vivienda y contexto de la emergencia, cuando corresponda.</li>
        <li>El profesional podrá registrar notas clínicas en su historia clínica electrónica en la plataforma.</li>
        <li>Después de la consulta, <strong>voluntarios de acompañamiento</strong> (llamados <strong>Ángeles</strong>) pueden contactarle para saber cómo está y si necesita ayuda — según la sección 5 de este término.</li>
        <li>En riesgo inminente para la vida, el profesional orientará atención presencial de urgencia o emergencia.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "3. Benefícios, limitações e riscos",
      en: "3. Benefits, limitations, and risks",
      es: "3. Beneficios, limitaciones y riesgos",
    },
    content: {
      pt: `<p><strong>Benefícios:</strong> acesso mais ágil à orientação profissional, redução de deslocamento e continuidade do cuidado quando o atendimento remoto for adequado — inclusive em situações de catástrofe ou crise humanitária.</p>
      <p class="mt-2"><strong>Limitações:</strong> o exame físico presencial pode ser parcial ou impossível; a qualidade depende da sua internet, dispositivo e ambiente; nem toda condição pode ser resolvida à distância.</p>
      <p class="mt-2"><strong>Riscos:</strong> falhas técnicas, interrupção da comunicação, atraso no reconhecimento de gravidade se as informações forem incompletas, ou necessidade de encaminhamento presencial.</p>
      <p class="mt-2"><strong>Alternativas:</strong> procurar unidades de saúde, pronto-atendimento ou serviço de emergência presencial, conforme a gravidade dos sintomas.</p>`,
      en: `<p><strong>Benefits:</strong> faster access to professional guidance, less travel, and care continuity when remote care is appropriate — including in disaster or humanitarian crises.</p>
      <p class="mt-2"><strong>Limitations:</strong> in-person physical examination may be limited or impossible; quality depends on your internet, device, and environment; not every condition can be managed remotely.</p>
      <p class="mt-2"><strong>Risks:</strong> technical failures, interrupted communication, delayed recognition of severity if information is incomplete, or need for in-person referral.</p>
      <p class="mt-2"><strong>Alternatives:</strong> in-person care at health facilities, urgent care, or emergency services, depending on symptom severity.</p>`,
      es: `<p><strong>Beneficios:</strong> acceso más ágil a orientación profesional, menos desplazamiento y continuidad del cuidado cuando la atención remota sea adecuada — incluso en catástrofes o crisis humanitarias.</p>
      <p class="mt-2"><strong>Limitaciones:</strong> el examen físico presencial puede ser parcial o imposible; la calidad depende de su internet, dispositivo y entorno; no toda condición puede resolverse a distancia.</p>
      <p class="mt-2"><strong>Riesgos:</strong> fallas técnicas, interrupción de la comunicación, retraso en reconocer gravedad si la información es incompleta, o necesidad de derivación presencial.</p>
      <p class="mt-2"><strong>Alternativas:</strong> acudir a centros de salud, urgencias o emergencias presenciales, según la gravedad.</p>`,
    },
  },
  {
    title: {
      pt: "4. Privacidade e proteção de dados (LGPD)",
      en: "4. Privacy and data protection",
      es: "4. Privacidad y protección de datos",
    },
    content: {
      pt: `<p>Seus dados de saúde são tratados conforme a <a href="/privacy" class="text-emerald-700 underline">Política de Privacidade</a> e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Profissional de saúde:</strong> recebe as informações necessárias para realizar a teleconsulta e registrar o atendimento.</li>
        <li><strong>Voluntários Anjos:</strong> em campanhas humanitárias, dados <strong>limitados</strong> (como nome, telefone, classificação de prioridade, resumo da triagem e da consulta) podem ser compartilhados com voluntários cadastrados e aprovados pela plataforma, exclusivamente para <strong>acompanhamento pós-consulta</strong> — ver seção 5.</li>
        <li><strong>Segurança:</strong> dados sensíveis são protegidos com criptografia e controles de acesso; apenas pessoas autorizadas podem visualizá-los.</li>
        <li><strong>Seus direitos:</strong> você pode solicitar acesso, correção, informações sobre o tratamento e exercer demais direitos previstos na LGPD, conforme a Política de Privacidade.</li>
      </ul>`,
      en: `<p>Your health data is processed under our <a href="/privacy" class="text-emerald-700 underline">Privacy Policy</a> and applicable data protection laws.</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Health professional:</strong> receives the information needed to provide teleconsultation and document the visit.</li>
        <li><strong>Angel volunteers:</strong> in humanitarian campaigns, <strong>limited</strong> data (such as name, phone, priority classification, and triage/consultation summary) may be shared with registered and platform-approved volunteers solely for <strong>post-consultation follow-up</strong> — see section 5.</li>
        <li><strong>Security:</strong> sensitive data is protected with encryption and access controls; only authorized persons may view it.</li>
        <li><strong>Your rights:</strong> you may request access, correction, information about processing, and other legal rights under our Privacy Policy.</li>
      </ul>`,
      es: `<p>Sus datos de salud se tratan conforme la <a href="/privacy" class="text-emerald-700 underline">Política de Privacidad</a> y las leyes aplicables de protección de datos.</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Profesional de salud:</strong> recibe la información necesaria para la teleconsulta y el registro del encuentro.</li>
        <li><strong>Voluntarios Ángeles:</strong> en campañas humanitarias, datos <strong>limitados</strong> (como nombre, teléfono, prioridad, resumen de triaje y consulta) pueden compartirse con voluntarios registrados y aprobados por la plataforma, solo para <strong>acompañamiento post-consulta</strong> — ver sección 5.</li>
        <li><strong>Seguridad:</strong> los datos sensibles se protegen con cifrado y controles de acceso.</li>
        <li><strong>Sus derechos:</strong> puede solicitar acceso, corrección e información sobre el tratamiento según la Política de Privacidad.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "5. Voluntários de acompanhamento (Anjos)",
      en: "5. Lay follow-up volunteers (Angels)",
      es: "5. Voluntarios de acompañamiento (Ángeles)",
    },
    content: {
      pt: `<p>Em atendimentos humanitários, a Doctor8 pode contar com <strong>voluntários leigos de acompanhamento</strong>, chamados <strong>Anjos</strong>. São pessoas de diversas áreas — não necessariamente profissionais de saúde — cadastradas, verificadas e aprovadas pela plataforma para ajudar <strong>após a consulta</strong>.</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>O que fazem:</strong> entram em contato por telefone ou WhatsApp para perguntar se você está bem, se precisa de ajuda (abrigo, medicamentos, apoio emocional, encaminhamentos) e registram o resultado na sua ficha humanitária na plataforma.</li>
        <li><strong>O que não fazem:</strong> Anjos <strong>não</strong> realizam diagnóstico, prescrevem medicamentos, substituem o profissional de saúde nem oferecem teleconsulta clínica.</li>
        <li><strong>Dados compartilhados:</strong> nome, telefone de contato, classificação de prioridade, resumo da triagem, informações da anamnese inicial e histórico das consultas humanitárias realizadas — <strong>não</strong> o prontuário clínico completo fora desse contexto.</li>
        <li><strong>Contato:</strong> ao aceitar este TCLE, você está ciente de que esses voluntários podem usar seus dados de contato para o acompanhamento descrito. Na anamnese, você poderá confirmar separadamente a autorização para contato telefônico ou por WhatsApp.</li>
        <li><strong>Gravidade:</strong> se você relatar situação de risco, o voluntário poderá sinalizar a equipe de coordenação ou orientar busca de atendimento profissional presencial ou nova teleconsulta.</li>
      </ul>`,
      en: `<p>In humanitarian care, Doctor8 may work with <strong>lay follow-up volunteers</strong> called <strong>Angels</strong>. They are people from various backgrounds — not necessarily healthcare professionals — registered, verified, and approved by the platform to help <strong>after your consultation</strong>.</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>What they do:</strong> contact you by phone or WhatsApp to ask how you are, whether you need help (shelter, medication, emotional support, referrals), and record the outcome in your humanitarian chart on the platform.</li>
        <li><strong>What they do not do:</strong> Angels <strong>do not</strong> diagnose, prescribe medication, replace your healthcare professional, or provide clinical teleconsultation.</li>
        <li><strong>Data shared:</strong> name, contact phone, priority classification, triage summary, initial intake information, and humanitarian visit history — <strong>not</strong> your full clinical record outside this context.</li>
        <li><strong>Contact:</strong> by accepting this ICF, you acknowledge that approved volunteers may use your contact details for the follow-up described. During intake, you may separately confirm authorization for phone or WhatsApp contact.</li>
        <li><strong>Urgent situations:</strong> if you report a risky situation, the volunteer may alert the coordination team or guide you to in-person care or a new teleconsultation.</li>
      </ul>`,
      es: `<p>En atención humanitaria, Doctor8 puede contar con <strong>voluntarios laicos de acompañamiento</strong> llamados <strong>Ángeles</strong>. Son personas de distintas áreas — no necesariamente profesionales de la salud — registradas, verificadas y aprobadas por la plataforma para ayudar <strong>después de la consulta</strong>.</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Qué hacen:</strong> se comunican por teléfono o WhatsApp para preguntar cómo está, si necesita ayuda (refugio, medicamentos, apoyo emocional, derivaciones) y registran el resultado en su ficha humanitaria en la plataforma.</li>
        <li><strong>Qué no hacen:</strong> los Ángeles <strong>no</strong> diagnostican, prescriben medicamentos, sustituyen al profesional de salud ni realizan teleconsulta clínica.</li>
        <li><strong>Datos compartidos:</strong> nombre, teléfono, prioridad, resumen de triaje, anamnesis inicial e historial de consultas humanitarias — <strong>no</strong> el historial clínico completo fuera de este contexto.</li>
        <li><strong>Contacto:</strong> al aceptar este TCLI, usted reconoce que voluntarios aprobados pueden usar sus datos de contacto para el acompañamiento descrito. En la anamnesis podrá confirmar por separado la autorización para contacto telefónico o por WhatsApp.</li>
        <li><strong>Situaciones graves:</strong> si reporta riesgo, el voluntario puede alertar al equipo de coordinación u orientar atención presencial o nueva teleconsulta.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "6. Gravação e documentação",
      en: "6. Recording and documentation",
      es: "6. Grabación y documentación",
    },
    content: {
      pt: `<p>A consulta por vídeo na Doctor8 <strong>não é gravada automaticamente</strong> pela plataforma, salvo consentimento específico e separado para gravação de áudio com finalidade de auxílio à documentação clínica, informado pelo profissional durante o atendimento.</p>
      <p class="mt-2">Anotações clínicas do profissional e registros de acompanhamento dos Anjos integram a documentação do atendimento humanitário na plataforma e seguem as normas éticas e legais aplicáveis, incluindo prazos de guarda de prontuário.</p>`,
      en: `<p>Video consultations on Doctor8 are <strong>not automatically recorded</strong> by the platform, unless separate specific consent is given for audio recording to assist clinical documentation, as explained by the professional during the visit.</p>
      <p class="mt-2">Clinical notes by the professional and Angel follow-up records form part of humanitarian care documentation on the platform and follow applicable ethical and legal standards, including medical record retention rules.</p>`,
      es: `<p>Las consultas por video en Doctor8 <strong>no se graban automáticamente</strong> en la plataforma, salvo consentimiento específico y separado para grabación de audio con fines de documentación clínica, informado por el profesional durante la atención.</p>
      <p class="mt-2">Las notas clínicas del profesional y los registros de acompañamiento de los Ángeles forman parte de la documentación humanitaria en la plataforma y siguen las normas éticas y legales aplicables.</p>`,
    },
  },
  {
    title: {
      pt: "7. Consentimento livre, esclarecido e revogável",
      en: "7. Free, informed, and revocable consent",
      es: "7. Consentimiento libre, informado y revocable",
    },
    content: {
      pt: `<ul class="list-disc pl-5 space-y-2">
        <li>Declaro que li (ou tive oportunidade de ler) este termo, compreendi suas informações e pude fazer perguntas antes de aceitar.</li>
        <li>Autorizo o atendimento em saúde a distância nas condições descritas, inclusive o compartilhamento limitado de dados com voluntários Anjos para acompanhamento pós-consulta em campanhas humanitárias.</li>
        <li>Entendo que posso recusar ou interromper o atendimento a qualquer momento, sem perder o direito a outros cuidados de saúde.</li>
        <li>Entendo que este consentimento pode ser revogado, observadas as obrigações legais de guarda dos registros já produzidos.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">Dúvidas: support@doctor8.org · Encarregado de dados (DPO): conforme <a href="/privacy" class="underline">Política de Privacidade</a>.</p>`,
      en: `<ul class="list-disc pl-5 space-y-2">
        <li>I declare that I have read (or had the opportunity to read) this form, understood its information, and could ask questions before accepting.</li>
        <li>I authorize remote healthcare under the conditions described, including limited sharing of data with Angel volunteers for post-consultation follow-up in humanitarian campaigns.</li>
        <li>I understand I may refuse or stop the visit at any time without losing the right to other healthcare.</li>
        <li>I understand this consent may be revoked, subject to legal obligations regarding records already created.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">Questions: support@doctor8.org · Data protection contact: see <a href="/privacy" class="underline">Privacy Policy</a>.</p>`,
      es: `<ul class="list-disc pl-5 space-y-2">
        <li>Declaro que leí (o tuve oportunidad de leer) este término, comprendí su información y pude hacer preguntas antes de aceptar.</li>
        <li>Autorizo la atención en salud a distancia en las condiciones descritas, incluido el intercambio limitado de datos con voluntarios Ángeles para acompañamiento post-consulta en campañas humanitarias.</li>
        <li>Entiendo que puedo rechazar o interrumpir la atención en cualquier momento sin perder el derecho a otros cuidados de salud.</li>
        <li>Entiendo que este consentimiento puede revocarse, observadas las obligaciones legales sobre registros ya producidos.</li>
      </ul>
      <p class="mt-3 text-slate-500 text-xs">Consultas: support@doctor8.org · Protección de datos: ver <a href="/privacy" class="underline">Política de Privacidad</a>.</p>`,
    },
  },
];
