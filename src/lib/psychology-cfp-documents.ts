// CFP document templates for the Psychologist Area (Res. CFP 09/2024, 13/2022, 001/2009, 06/2019, 16/2019, LGPD).

export type CfpDocumentTemplateId =
  | "TDIC_CONSENT"
  | "TDIC_CONTRACT"
  | "MINOR_PSYCHOTHERAPY_AUTH"
  | "MINOR_GENERAL_AUTH"
  | "ADOLESCENT_ASSENT"
  | "SESSION_RECORDING_CONSENT"
  | "CONTRACT_ADDENDUM"
  | "SERVICE_CLOSURE_RECORD"
  | "ATTENDANCE_DECLARATION"
  | "PSYCHOLOGICAL_REPORT"
  | "REFERRAL_NETWORK"
  | "EMERGENCY_RECORD";

export interface CfpDocumentTemplate {
  id: CfpDocumentTemplateId;
  titlePt: string;
  titleEn: string;
  titleEs: string;
  descriptionPt: string;
  descriptionEn: string;
  descriptionEs: string;
  bodyPt: string;
  bodyEn: string;
  bodyEs: string;
}

const ADMIN_DOC_TYPES: CfpDocumentTemplateId[] = [
  "TDIC_CONSENT",
  "TDIC_CONTRACT",
  "MINOR_PSYCHOTHERAPY_AUTH",
  "MINOR_GENERAL_AUTH",
  "ADOLESCENT_ASSENT",
  "SESSION_RECORDING_CONSENT",
  "CONTRACT_ADDENDUM",
  "ATTENDANCE_DECLARATION",
];

export function cfpDocumentSaveType(id: CfpDocumentTemplateId): "OTHER" | "CLINICAL_NOTE" {
  return ADMIN_DOC_TYPES.includes(id) ? "OTHER" : "CLINICAL_NOTE";
}

export const CFP_DOCUMENT_TEMPLATES: CfpDocumentTemplate[] = [
  {
    id: "TDIC_CONSENT",
    titlePt: "TCLE — atendimento por TDICs",
    titleEn: "Informed consent (TCLE) — telepsychology",
    titleEs: "TCLE — atención por TDICs",
    descriptionPt: "CEPP Art. 6, Res. CFP 001/2009, Res. 09/2024 e LGPD — consentimento informado antes do atendimento.",
    descriptionEn: "Professional Ethics Code Art. 6, CFP Res. 001/2009, 09/2024 and LGPD — informed consent before care.",
    descriptionEs: "CEPP Art. 6, Res. CFP 001/2009, 09/2024 y LGPD — consentimiento informado antes de la atención.",
    bodyPt: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)
Atendimento Psicológico Mediado por TDICs

Psicóloga(o): _______________________________________________
CRP: _________________  E-mail: _____________________________
Telefone: __________________________________________________

Paciente: __________________________________________________
CPF: _____________________  Data de nascimento: _____________
Endereço (cidade/UF): ______________________________________
Telefone/e-mail: ___________________________________________

Responsável legal (se menor de 18 anos ou interditado):
Nome: _________________________  Parentesco: _______________
CPF: _________________________  Telefone: ___________________

────────────────────────────────────────────────────────────

1. NATUREZA E OBJETIVOS DO ATENDIMENTO

Declaro que fui informado(a) de que o atendimento psicológico consiste
em um processo de escuta, acolhimento e intervenção conduzido por
psicóloga(o) habilitada(o), com o objetivo de promover bem-estar emocional,
saúde mental e desenvolvimento pessoal.

O serviço será prestado na modalidade MEDIADA POR TECNOLOGIAS
DIGITAIS DA INFORMAÇÃO E DA COMUNICAÇÃO (TDICs), conforme
Resolução CFP nº 09/2024, por meio de videoconferência, mensagens e
prontuário eletrônico.

Natureza do serviço: ( ) Psicoterapia  ( ) Avaliação psicológica
( ) Orientação psicológica  ( ) Outro: _________________________

Abordagem terapêutica (quando aplicável): ____________________

Não há garantia de resultado específico, prazo determinado ou "cura"
de qualquer condição. Os resultados dependem do engajamento ativo
do(a) paciente e da qualidade da relação terapêutica.

2. RECURSOS TECNOLÓGICOS E SIGILO PROFISSIONAL

Fui informado(a) de que a plataforma Doctor8 utiliza os seguintes
recursos tecnológicos:

  • Videoconferência para sessões síncronas
  • Prontuário eletrônico para registro clínico
  • Mensagens para comunicação assíncrona (quando habilitada)
  • Armazenamento em servidores com criptografia e controle de acesso

Todas as informações compartilhadas são protegidas pelo sigilo
profissional (CEPP, Art. 9º). O sigilo somente poderá ser quebrado nas
seguintes situações, previstas em lei:

  a) Risco iminente e sério à vida do(a) paciente ou de terceiros;
  b) Determinação judicial fundamentada;
  c) Comunicação obrigatória a autoridades competentes prevista
     em legislação específica (ex.: notificação compulsória).

Sempre que possível, serei comunicado(a) antes da quebra de sigilo.

3. LIMITES DO ATENDIMENTO REMOTO

Fui informado(a) de que:

  a) O atendimento por TDICs pode não ser adequado a todas as
     demandas clínicas, especialmente em situações de risco à
     integridade, violência, urgência ou emergência;
  b) Nesses casos, a profissional poderá encaminhar-me à rede
     presencial de proteção (CAPS, SAMU 192, CVV 188, delegacias,
     Conselho Tutelar, entre outros);
  c) É minha responsabilidade garantir privacidade do ambiente
     físico durante as sessões e informar interrupções de conexão;
  d) Gravações de sessões só ocorrerão com meu consentimento
     expresso e por escrito (Res. CFP nº 13/2022, Art. 11).

4. PRONTUÁRIO E PROTEÇÃO DE DADOS (LGPD)

Os dados pessoais e informações clínicas serão registrados em prontuário
psicológico eletrônico, conforme Resolução CFP nº 001/2009 e Resolução
CFP nº 09/2024.

  • Dados coletados: identificação, contato, histórico clínico e
    registros de sessão
  • Finalidade: prestação de serviços psicológicos e cumprimento de
    obrigações legais e éticas
  • Base legal: execução de contrato (LGPD, Art. 7º, V) e tratamento
    de dados de saúde (LGPD, Art. 11, II, "f")
  • Armazenamento: ambiente seguro, com acesso restrito à profissional
  • Prazo de guarda: mínimo de 5 anos após o último atendimento
    (ou 5 anos após completar 18 anos, no caso de menores)
  • Compartilhamento: não serão compartilhados com terceiros, salvo
    nas exceções do item 2

Tenho direito de solicitar acesso, correção ou exclusão dos meus dados
(LGPD, Art. 18), observadas as obrigações legais de guarda do prontuário.

5. DIREITOS DO(A) PACIENTE

Tenho direito de:

  • Receber informações claras sobre o processo terapêutico;
  • Esclarecer dúvidas sobre qualquer aspecto do atendimento;
  • Encerrar o processo a qualquer momento, sem penalidade;
  • Solicitar encaminhamento a outro profissional;
  • Receber cópia deste documento;
  • Revogar este consentimento a qualquer momento.

6. DECLARAÇÃO DE CONSENTIMENTO

Declaro que li e compreendi todas as informações acima, tive
oportunidade de esclarecer minhas dúvidas com a profissional, e
consinto livre e esclarecidamente com o início do atendimento
psicológico nas condições descritas.

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
Assinatura do(a) Paciente (ou Responsável Legal)
Nome completo: _________________________________
CPF: ___________________________________________

_______________________________________________
Assinatura da Psicóloga(o)
Nome completo: _________________________________
CRP: ___________________________________________`,
    bodyEn: `INFORMED CONSENT (TCLE)
Psychological Care Mediated by TDICs

Psychologist: _______________________________________________
License (CRP): _________________  Email: ____________________
Phone: ______________________________________________________

Patient: ____________________________________________________
ID (CPF): __________________  Date of birth: __________________
Address (city/state): _______________________________________
Phone/email: ________________________________________________

Legal guardian (if under 18 or legally incapacitated):
Name: _________________________  Relationship: ______________
ID: ___________________________  Phone: ______________________

────────────────────────────────────────────────────────────

1. NATURE AND OBJECTIVES OF CARE

I declare that I have been informed that psychological care consists
of a process of listening, support and intervention conducted by a
licensed psychologist, aimed at promoting emotional well-being, mental
health and personal development.

Services will be provided through DIGITAL INFORMATION AND
COMMUNICATION TECHNOLOGIES (TDICs), per CFP Resolution 09/2024,
via videoconference, messaging and electronic records.

Nature of service: ( ) Psychotherapy  ( ) Psychological assessment
( ) Psychological counseling  ( ) Other: ______________________

Therapeutic approach (if applicable): __________________________

There is no guarantee of specific results, fixed duration or "cure"
of any condition. Outcomes depend on the patient's active engagement
and the quality of the therapeutic relationship.

2. TECHNOLOGY RESOURCES AND CONFIDENTIALITY

I have been informed that the Doctor8 platform uses:

  • Videoconference for synchronous sessions
  • Electronic chart for clinical records
  • Messaging for asynchronous communication (when enabled)
  • Encrypted storage with access controls

All shared information is protected by professional confidentiality
(Professional Ethics Code, Art. 9). Confidentiality may only be broken in:

  a) Imminent and serious risk to the patient's or third parties' life;
  b) Grounded court order;
  c) Mandatory reporting required by specific legislation.

Whenever possible, I will be notified before any breach of confidentiality.

3. LIMITS OF REMOTE CARE

I have been informed that:

  a) TDIC-mediated care may not suit all clinical demands, especially
     situations involving integrity risk, violence, urgency or emergency;
  b) In such cases, the professional may refer me to in-person protection
     networks (CAPS, SAMU 192, CVV 188, police, Child Protection Council, etc.);
  c) I am responsible for ensuring privacy during sessions and reporting
     connection interruptions;
  d) Session recordings only occur with my express written consent
     (CFP Resolution 13/2022, Art. 11).

4. CHART AND DATA PROTECTION (LGPD)

Personal and clinical data will be recorded in an electronic psychological
chart, per CFP Resolutions 001/2009 and 09/2024.

  • Data collected: identification, contact, clinical history and session records
  • Purpose: provision of psychological services and legal/ethical compliance
  • Legal basis: contract performance (LGPD, Art. 7, V) and health data
    processing (LGPD, Art. 11, II, "f")
  • Storage: secure environment with restricted access
  • Retention: minimum 5 years after last session (or 5 years after turning 18 for minors)
  • Sharing: not shared with third parties except as in item 2

I may request access, correction or deletion of my data (LGPD, Art. 18),
subject to legal chart retention obligations.

5. PATIENT RIGHTS

I have the right to:

  • Receive clear information about the therapeutic process;
  • Clarify any questions about care;
  • End the process at any time without penalty;
  • Request referral to another professional;
  • Receive a copy of this document;
  • Revoke this consent at any time.

6. CONSENT DECLARATION

I declare that I have read and understood all information above, had
the opportunity to clarify questions with the professional, and freely
and knowingly consent to begin psychological care under the described
conditions.

Place and date: ___________________, __________ __, ______.

_______________________________________________
Patient (or Legal Guardian) signature
Full name: ______________________________________
ID: _____________________________________________

_______________________________________________
Psychologist signature
Full name: ______________________________________
License (CRP): __________________________________`,
    bodyEs: `TERMO DE CONSENTIMIENTO LIBRE Y ESCLARECIDO (TCLE)
Atención Psicológica Mediada por TDICs

Psicólogo(a): _______________________________________________
Registro (CRP): _________________  E-mail: ___________________
Teléfono: ___________________________________________________

Paciente: ___________________________________________________
CPF: _____________________  Fecha de nacimiento: ______________
Dirección (ciudad/UF): ______________________________________
Teléfono/e-mail: ____________________________________________

Responsable legal (si menor de 18 años o interdicto):
Nombre: _______________________  Parentesco: ________________
CPF: __________________________  Teléfono: ___________________

────────────────────────────────────────────────────────────

1. NATURALEZA Y OBJETIVOS DE LA ATENCIÓN

Declaro haber sido informado(a) de que la atención psicológica consiste
en un proceso de escucha, acogida e intervención conducido por
psicólogo(a) habilitado(a), con el objetivo de promover bienestar
emocional, salud mental y desarrollo personal.

El servicio se prestará en modalidad MEDIADA POR TECNOLOGÍAS
DIGITALES DE LA INFORMACIÓN Y LA COMUNICACIÓN (TDICs),
conforme Resolución CFP nº 09/2024, mediante videoconferencia,
mensajes y prontuario electrónico.

Naturaleza del servicio: ( ) Psicoterapia  ( ) Evaluación psicológica
( ) Orientación psicológica  ( ) Otro: __________________________

Enfoque terapéutico (cuando aplique): _________________________

No hay garantía de resultado específico, plazo determinado o "cura"
de ninguna condición. Los resultados dependen del compromiso activo
del/de la paciente y de la calidad de la relación terapéutica.

2. RECURSOS TECNOLÓGICOS Y SIGILO PROFESIONAL

Fui informado(a) de que la plataforma Doctor8 utiliza:

  • Videoconferencia para sesiones síncronas
  • Prontuario electrónico para registro clínico
  • Mensajes para comunicación asíncrona (cuando esté habilitada)
  • Almacenamiento con cifrado y control de acceso

Toda información compartida está protegida por el sigilo profesional
(CEPP, Art. 9º). El sigilo solo podrá romperse en:

  a) Riesgo inminente y grave para la vida del/de la paciente o terceros;
  b) Determinación judicial fundamentada;
  c) Comunicación obligatoria a autoridades prevista en ley específica.

Siempre que sea posible, seré informado(a) antes de la ruptura del sigilo.

3. LÍMITES DE LA ATENCIÓN REMOTA

Fui informado(a) de que:

  a) La atención por TDICs puede no ser adecuada a todas las demandas,
     especialmente riesgo a la integridad, violencia, urgencia o emergencia;
  b) En esos casos, el/la profesional puede derivarme a la red presencial
     de protección (CAPS, SAMU 192, CVV 188, delegacias, Consejo Tutelar, etc.);
  c) Es mi responsabilidad garantizar privacidad del entorno durante las sesiones;
  d) Las grabaciones solo ocurrirán con mi consentimiento expreso por escrito
     (Res. CFP nº 13/2022, Art. 11).

4. PRONTUARIO Y PROTECCIÓN DE DATOS (LGPD)

Los datos personales e información clínica se registrarán en prontuario
psicológico electrónico, conforme Resoluciones CFP nº 001/2009 y 09/2024.

  • Datos: identificación, contacto, historial clínico y registros de sesión
  • Finalidad: prestación de servicios psicológicos y cumplimiento legal/ético
  • Base legal: ejecución de contrato (LGPD, Art. 7º, V) y datos de salud (Art. 11, II, "f")
  • Almacenamiento: entorno seguro con acceso restringido
  • Plazo de guarda: mínimo 5 años tras el último atendimiento
  • Compartimiento: no se comparten con terceros salvo excepciones del ítem 2

Tengo derecho a solicitar acceso, corrección o eliminación de mis datos
(LGPD, Art. 18), observadas las obligaciones legales de guarda.

5. DERECHOS DEL/LA PACIENTE

Tengo derecho a:

  • Recibir información clara sobre el proceso terapéutico;
  • Aclarar dudas sobre cualquier aspecto de la atención;
  • Interrumpir el proceso en cualquier momento, sin penalidad;
  • Solicitar derivación a otro profesional;
  • Recibir copia de este documento;
  • Revocar este consentimiento en cualquier momento.

6. DECLARACIÓN DE CONSENTIMIENTO

Declaro haber leído y comprendido toda la información anterior, haber
tenido oportunidad de aclarar mis dudas con el/la profesional, y consiento
libre y esclarecidamente con el inicio de la atención psicológica en las
condiciones descritas.

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
Firma del/de la Paciente (o Responsable Legal)
Nombre completo: _______________________________
CPF: ___________________________________________

_______________________________________________
Firma del/de la Psicólogo(a)
Nombre completo: _______________________________
CRP: ___________________________________________`,
  },
  {
    id: "TDIC_CONTRACT",
    titlePt: "Contrato de prestação de serviços (TDICs)",
    titleEn: "Psychological services agreement (TDICs)",
    titleEs: "Contrato de prestación de servicios (TDICs)",
    descriptionPt: "Res. CFP 09/2024 Art. 7º e Res. 13/2022 Art. 3º — contrato escrito de prestação de serviços.",
    descriptionEn: "CFP Res. 09/2024 Art. 7 and Res. 13/2022 Art. 3 — written services agreement.",
    descriptionEs: "Res. CFP 09/2024 Art. 7 y Res. 13/2022 Art. 3 — contrato escrito de prestación de servicios.",
    bodyPt: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS
MEDIADOS POR TDICs

Pelo presente instrumento particular, as partes abaixo identificadas
celebram o presente Contrato de Prestação de Serviços Psicológicos,
mediados por Tecnologias Digitais da Informação e da Comunicação
(TDICs), nos termos da Resolução CFP nº 09/2024, Resolução CFP nº
13/2022 (quando psicoterapia) e demais normas aplicáveis.

────────────────────────────────────────────────────────────
1. DAS PARTES

1.1. CONTRATADA (Prestadora de Serviços):
Nome: _______________________________________________________
CRP: _________________  CPF/CNPJ: ___________________________
Endereço profissional: _______________________________________
E-mail: ______________________  Telefone: ____________________

1.2. CONTRATANTE (Paciente / Usuário do serviço):
Nome: _______________________________________________________
CPF: _____________________  Data de nascimento: _____________
Endereço: ___________________________________________________
E-mail: ______________________  Telefone: ____________________

1.3. Responsável legal (quando aplicável — menores de 18 anos
     ou interditados):
Nome: _________________________  Parentesco: _______________
CPF: _________________________  Telefone: ___________________

────────────────────────────────────────────────────────────
2. DO OBJETO

2.1. O presente contrato tem por objeto a prestação de serviços
     psicológicos na modalidade mediada por TDICs, especificamente:

     Natureza do serviço: ( ) Psicoterapia  ( ) Avaliação psicológica
     ( ) Orientação psicológica  ( ) Outro: ______________________

     Abordagem: _______________________________________________

2.2. Os serviços serão prestados por meio da plataforma Doctor8,
     utilizando os seguintes recursos tecnológicos:

     • Videoconferência para sessões síncronas
     • Prontuário eletrônico para registro documental
     • Mensagens para comunicação assíncrona (quando habilitada)
     • Pagamento eletrônico (quando aplicável)

2.3. A CONTRATADA especifica que os recursos acima empregam
     medidas de segurança (criptografia, controle de acesso e
     autenticação) para garantir o sigilo das informações, conforme
     parágrafo único do Art. 7º da Resolução CFP nº 09/2024.

────────────────────────────────────────────────────────────
3. DIREITOS E DEVERES DAS PARTES

3.1. São direitos do(a) CONTRATANTE:
     a) Receber serviços psicológicos de qualidade, em condições
        dignas e apropriadas;
     b) Ser informado(a) sobre a natureza, objetivos e limites do serviço;
     c) Interromper o serviço a qualquer momento, sem penalidade;
     d) Ter garantido o sigilo profissional, nos termos do CEPP;
     e) Solicitar documentos psicológicos decorrentes do serviço
        prestado, sem cobrança adicional indevida;
     f) Ter acesso ao Código de Ética Profissional do Psicólogo.

3.2. São deveres do(a) CONTRATANTE:
     a) Comparecer pontualmente às sessões agendadas;
     b) Comunicar faltas com antecedência mínima de 24 horas;
     c) Garantir ambiente privado e adequado durante as sessões remotas;
     d) Informar interrupções de conexão ou problemas técnicos;
     e) Efetuar o pagamento conforme acordado;
     f) Fornecer informações verídicas relevantes ao atendimento.

3.3. São deveres da CONTRATADA:
     a) Prestar serviços com qualidade técnica e ética;
     b) Manter registro documental (prontuário) de todos os atendimentos,
        conforme Res. CFP nº 001/2009;
     c) Resguardar o sigilo profissional;
     d) Informar sobre limites do atendimento remoto e procedimentos
        em situações de urgência/emergência (Res. CFP 09/2024, Art. 5º);
     e) Especificar os recursos tecnológicos e medidas de sigilo.

────────────────────────────────────────────────────────────
4. CONDIÇÕES DO ATENDIMENTO

4.1. Frequência: ( ) semanal  ( ) quinzenal  ( ) mensal  ( ) outra: ___
4.2. Duração de cada sessão: _____ minutos
4.3. Horários: _______________________________________________
4.4. Modalidade: exclusivamente remota (TDICs) / híbrida: ________

4.5. Impossibilidade de previsão de resultados: as partes reconhecem
     que não é possível estabelecer previsões taxativas de resultados
     do processo psicológico/psicoterapêutico (Res. CFP 13/2022,
     Art. 3º, I, "c").

4.6. Registro documental: os serviços prestados serão registrados
     em prontuário eletrônico (Res. CFP 13/2022, Art. 3º, I, "e").

────────────────────────────────────────────────────────────
5. HONORÁRIOS E PAGAMENTO

5.1. Valor por sessão: R$ _____________ (_________________________)
5.2. Forma de pagamento: ( ) PIX  ( ) cartão  ( ) transferência  ( ) outro
5.3. Vencimento: ______________________________________________
5.4. Política de cancelamento/reagendamento:
     Cancelamentos com menos de 24 horas de antecedência
     _________________________________________________________
     ( ) implicam cobrança integral  ( ) permitem reagendamento

5.5. Reajuste de valores: mediante comunicação prévia de _____ dias
     e termo aditivo assinado por ambas as partes.

────────────────────────────────────────────────────────────
6. SIGILO, PRIVACIDADE E LGPD

6.1. As informações compartilhadas são protegidas pelo sigilo
     profissional, com exceções previstas em lei.
6.2. Os dados pessoais serão tratados conforme a Lei nº 13.709/2018 (LGPD).
6.3. O prontuário será mantido por, no mínimo, 5 anos após o
     último atendimento.

────────────────────────────────────────────────────────────
7. RESCISÃO

7.1. O presente contrato poderá ser rescindido por qualquer das
     partes, a qualquer momento, mediante comunicação à outra parte.
7.2. Recomenda-se comunicação com antecedência de ao menos uma
     sessão para encerramento adequado do processo.

────────────────────────────────────────────────────────────
8. DISPOSIÇÕES FINAIS

8.1. Este contrato não estabelece vínculo empregatício entre as partes.
8.2. Alterações somente produzirão efeito mediante termo aditivo
     assinado por ambas as partes.
8.3. A CONTRATADA disponibilizará ao(à) CONTRATANTE o Código
     de Ética Profissional do Psicólogo.
8.4. Plataforma/intermediadora (quando aplicável): Doctor8.

────────────────────────────────────────────────────────────
9. FORO

As partes elegem o foro da Circunscrição Judiciária de
___________________________ (jurisdição do CRP de inscrição
principal da CONTRATADA), conforme Art. 7º, III, da Resolução
CFP nº 09/2024.

────────────────────────────────────────────────────────────

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
CONTRATANTE (Paciente ou Responsável Legal)
CPF: ___________________________________________

_______________________________________________
CONTRATADA (Psicóloga/o)
CRP: ___________________________________________`,
    bodyEn: `PSYCHOLOGICAL SERVICES AGREEMENT
MEDIATED BY TDICs

The parties identified below enter into this Psychological Services
Agreement mediated by Digital Information and Communication
Technologies (TDICs), under CFP Resolution 09/2024, Resolution 13/2022
(when psychotherapy) and applicable regulations.

────────────────────────────────────────────────────────────
1. PARTIES

1.1. PROVIDER:
Name: _______________________________________________________
License (CRP): _________________  Tax ID: ____________________
Professional address: _________________________________________
Email: ______________________  Phone: _______________________

1.2. CLIENT (Patient / Service user):
Name: _______________________________________________________
Tax ID: __________________  Date of birth: ____________________
Address: ____________________________________________________
Email: ______________________  Phone: _________________________

1.3. Legal guardian (when applicable):
Name: _________________________  Relationship: _______________
Tax ID: _______________________  Phone: _______________________

────────────────────────────────────────────────────────────
2. PURPOSE

2.1. This agreement covers psychological services via TDICs:

     Service type: ( ) Psychotherapy  ( ) Assessment
     ( ) Counseling  ( ) Other: ________________________________

     Approach: _________________________________________________

2.2. Services will be provided through the Doctor8 platform:
     • Videoconference  • Electronic chart  • Messaging  • Electronic payment

2.3. The PROVIDER specifies that these resources use encryption,
     access controls and authentication to ensure confidentiality,
     per CFP Resolution 09/2024, Art. 7, sole paragraph.

────────────────────────────────────────────────────────────
3. RIGHTS AND DUTIES

3.1. CLIENT rights: quality care, information, termination at any time,
     confidentiality, documents, access to Ethics Code.
3.2. CLIENT duties: punctuality, 24h cancellation notice, private environment,
     report technical issues, payment, truthful information.
3.3. PROVIDER duties: ethical quality care, chart records (Res. 001/2009),
     confidentiality, emergency procedures (Res. 09/2024 Art. 5), specify technology.

────────────────────────────────────────────────────────────
4. CARE CONDITIONS

4.1. Frequency: ( ) weekly  ( ) biweekly  ( ) monthly  ( ) other: ___
4.2. Session duration: _____ minutes
4.3. Schedule: ________________________________________________
4.4. Modality: remote (TDICs) / hybrid: _________________________

4.5. No guaranteed results (CFP Res. 13/2022, Art. 3, I, "c").
4.6. All services recorded in electronic chart (Res. 13/2022, Art. 3, I, "e").

────────────────────────────────────────────────────────────
5. FEES AND PAYMENT

5.1. Fee per session: __________________________________________
5.2. Payment method: ( ) PIX  ( ) card  ( ) transfer  ( ) other
5.3. Due date: ________________________________________________
5.4. Cancellation policy (< 24h): _______________________________
5.5. Fee adjustments: _____ days notice + signed addendum.

────────────────────────────────────────────────────────────
6. CONFIDENTIALITY AND LGPD

Professional confidentiality applies with legal exceptions.
Personal data processed per Law 13.709/2018 (LGPD).
Chart retained minimum 5 years after last session.

────────────────────────────────────────────────────────────
7. TERMINATION

Either party may terminate at any time with notice.
Recommended: at least one session notice for proper closure.

────────────────────────────────────────────────────────────
8. FINAL PROVISIONS

No employment relationship. Changes require signed addendum.
Ethics Code available to CLIENT. Platform: Doctor8 (when applicable).

────────────────────────────────────────────────────────────
9. JURISDICTION

Parties elect jurisdiction of _____________________________
(PROVIDER's primary CRP region), per CFP Res. 09/2024 Art. 7, III.

────────────────────────────────────────────────────────────

Place and date: ___________________, __________ __, ______.

_______________________________________________
CLIENT (Patient or Legal Guardian)

_______________________________________________
PROVIDER (Psychologist) — License (CRP): _________`,
    bodyEs: `CONTRATO DE PRESTACIÓN DE SERVICIOS PSICOLÓGICOS
MEDIADOS POR TDICs

Las partes abajo identificadas celebran el presente Contrato de
Prestación de Servicios Psicológicos mediados por Tecnologías
Digitales de la Información y la Comunicación (TDICs), conforme
Resolución CFP nº 09/2024, Resolución CFP nº 13/2022 (si psicoterapia)
y demás normas aplicables.

────────────────────────────────────────────────────────────
1. DE LAS PARTES

1.1. CONTRATADA (Prestadora):
Nombre: _____________________________________________________
CRP: _________________  CPF/CNPJ: ____________________________
Dirección profesional: ________________________________________
E-mail: ______________________  Teléfono: ____________________

1.2. CONTRATANTE (Paciente / Usuario del servicio):
Nombre: _____________________________________________________
CPF: _____________________  Fecha de nacimiento: _____________
Dirección: ___________________________________________________
E-mail: ______________________  Teléfono: ____________________

1.3. Responsable legal (cuando aplique):
Nombre: _________________________  Parentesco: _______________
CPF: _________________________  Teléfono: ___________________

────────────────────────────────────────────────────────────
2. DEL OBJETO

2.1. Prestación de servicios psicológicos por TDICs:

     Naturaleza: ( ) Psicoterapia  ( ) Evaluación  ( ) Orientación  ( ) Otro: _____
     Enfoque: __________________________________________________

2.2. Plataforma Doctor8: videoconferencia, prontuario electrónico,
     mensajes y pago electrónico (cuando aplique).

2.3. La CONTRATADA especifica medidas de seguridad (cifrado,
     control de acceso) para garantizar el sigilo (Res. CFP 09/2024, Art. 7º).

────────────────────────────────────────────────────────────
3. DERECHOS Y DEBERES

3.1. Derechos del/de la CONTRATANTE: calidad, información,
     interrupción libre, sigilo, documentos, Código de Ética.
3.2. Deberes del/de la CONTRATANTE: puntualidad, aviso 24h,
     privacidad del entorno, informar problemas técnicos, pago, veracidad.
3.3. Deberes de la CONTRATADA: calidad ética, prontuario (Res. 001/2009),
     sigilo, urgencias (Res. 09/2024 Art. 5), especificar tecnología.

────────────────────────────────────────────────────────────
4. CONDICIONES DE LA ATENCIÓN

4.1. Frecuencia: ( ) semanal  ( ) quincenal  ( ) mensual  ( ) otra: ___
4.2. Duración por sesión: _____ minutos
4.3. Horarios: _______________________________________________
4.4. Modalidad: remota (TDICs) / híbrida: ______________________

4.5. Imposibilidad de previsión de resultados (Res. CFP 13/2022, Art. 3º, I, "c").
4.6. Registro en prontuario electrónico (Res. CFP 13/2022, Art. 3º, I, "e").

────────────────────────────────────────────────────────────
5. HONORARIOS Y PAGO

5.1. Valor por sesión: R$ _____________________________________
5.2. Forma de pago: ( ) PIX  ( ) tarjeta  ( ) transferencia  ( ) otro
5.3. Vencimiento: _____________________________________________
5.4. Política de cancelación (< 24h): __________________________
5.5. Reajuste: aviso previo de _____ días + término aditivo firmado.

────────────────────────────────────────────────────────────
6. SIGILO, PRIVACIDAD Y LGPD

Sigilo profesional con excepciones legales. Datos conforme Ley 13.709/2018.
Prontuario guardado mínimo 5 años tras último atendimiento.

────────────────────────────────────────────────────────────
7. RESCISIÓN

Cualquier parte puede rescindir en cualquier momento con comunicación.
Se recomienda aviso de al menos una sesión para cierre adecuado.

────────────────────────────────────────────────────────────
8. DISPOSICIONES FINALES

Sin vínculo laboral. Cambios requieren término aditivo firmado.
Código de Ética disponible. Plataforma: Doctor8 (cuando aplique).

────────────────────────────────────────────────────────────
9. FORO

Foro de _____________________________ (jurisdicción del CRP de
inscripción principal de la CONTRATADA), Res. CFP 09/2024 Art. 7º, III.

────────────────────────────────────────────────────────────

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
CONTRATANTE (Paciente o Responsable Legal)

_______________________________________________
CONTRATADA (Psicólogo/a) — CRP: _______________`,
  },
  {
    id: "MINOR_PSYCHOTHERAPY_AUTH",
    titlePt: "Autorização — psicoterapia (menor de 18 anos)",
    titleEn: "Authorization — psychotherapy (under 18)",
    titleEs: "Autorización — psicoterapia (menor de 18 años)",
    descriptionPt: "Res. CFP 13/2022 Anexo I — autorização escrita do responsável legal antes da psicoterapia.",
    descriptionEn: "CFP Res. 13/2022 Annex I — written legal guardian authorization before psychotherapy.",
    descriptionEs: "Res. CFP 13/2022 Anexo I — autorización escrita del responsable legal antes de psicoterapia.",
    bodyPt: `AUTORIZAÇÃO PARA ACOMPANHAMENTO PSICOTERAPÊUTICO
DE CRIANÇAS E ADOLESCENTES (MENORES DE 18 ANOS)
(Resolução CFP nº 13/2022 — Anexo I)

Eu, _________________________________________________________,
data de nascimento: ____/____/____, portador(a) do documento de
identidade nº: ____________________, domiciliado(a) à:
________________________________________________________________,
responsável legal pela criança/adolescente:
_________________________________________________________,
data de nascimento: ____/____/____, portador(a) do documento de
identidade nº: ____________________, autorizo o(a) profissional
________________________________________________, psicóloga(o),
sob registro CRP ___/__________, a realizar acompanhamento
psicoterapêutico mediado por TDICs (quando aplicável) e os
encaminhamentos cabíveis.

Todas as intervenções e documentos produzidos serão regidos pelos
dispositivos legais vigentes, em especial pelo Código de Ética
Profissional do Psicólogo (Resolução CFP nº 10/2005), Resolução
CFP nº 09/2024, Resolução CFP nº 13/2022 e demais normas da
Psicologia relacionadas ao exercício da profissão.

Em especial, serão garantidos à criança ou adolescente o sigilo das
informações e a preservação da dignidade e da intimidade durante a
prestação dos serviços de que trata esta autorização.

_______________, ____/____/______
(Cidade) / (Data)

__________________________________________
Responsável Legal pela Criança ou Adolescente

__________________________________________
Nome completo, CRP e carimbo da Psicóloga(o)`,
    bodyEn: `AUTHORIZATION FOR PSYCHOTHERAPEUTIC FOLLOW-UP
OF CHILDREN AND ADOLESCENTS (UNDER 18)
(CFP Resolution 13/2022 — Annex I)

I, ____________________________________________________________,
date of birth: ____/____/____, ID document no.: __________________,
address: ______________________________________________________,
legal guardian of the child/adolescent:
__________________________________________________________,
date of birth: ____/____/____, ID no.: __________________________,
authorize professional ________________________________________,
psychologist, registered under CRP ___/__________, to provide
psychotherapeutic follow-up (including via TDICs when applicable)
and appropriate referrals.

All interventions and documents will comply with applicable law,
especially the Professional Ethics Code (CFP Res. 10/2005),
Resolutions 09/2024 and 13/2022, and related Psychology regulations.

The child's or adolescent's confidentiality, dignity and privacy
will be preserved during services covered by this authorization.

_______________, ____/____/______
(City) / (Date)

__________________________________________
Legal Guardian of the Child or Adolescent

__________________________________________
Psychologist full name, license and stamp`,
    bodyEs: `AUTORIZACIÓN PARA ACOMPAÑAMIENTO PSICOTERAPÉUTICO
DE NIÑOS, NIÑAS Y ADOLESCENTES (MENORES DE 18 AÑOS)
(Resolución CFP nº 13/2022 — Anexo I)

Yo, ___________________________________________________________,
fecha de nacimiento: ____/____/____, documento de identidad nº:
____________________, domiciliado(a) en:
______________________________________________________________,
responsable legal del/de la niño/a/adolescente:
__________________________________________________________,
fecha de nacimiento: ____/____/____, documento nº: ______________,
autorizo al/a la profesional ___________________________________,
psicólogo(a), inscrito(a) en el CRP ___/__________, a realizar
acompañamiento psicoterapéutico mediado por TDICs (cuando aplique)
y las derivaciones pertinentes.

Todas las intervenciones y documentos se regirán por la legislación
vigente, especialmente el Código de Ética Profesional del Psicólogo
(Res. CFP nº 10/2005), Resoluciones 09/2024 y 13/2022 y demás
normas de la Psicología.

Se garantizarán el sigilo, la dignidad y la intimidad del/de la
niño/a/adolescente durante la prestación de los servicios.

_______________, ____/____/______
(Ciudad) / (Fecha)

__________________________________________
Responsable Legal del/de la Niño/a o Adolescente

__________________________________________
Nombre completo, CRP y sello del/de la Psicólogo(a)`,
  },
  {
    id: "MINOR_GENERAL_AUTH",
    titlePt: "Autorização — atendimento não eventual (menor)",
    titleEn: "Authorization — non-occasional care (minor)",
    titleEs: "Autorización — atención no eventual (menor)",
    descriptionPt: "Res. CFP 16/2019 Anexo V / CEPP Art. 8º — atendimento ou avaliação psicológica de crianças e adolescentes.",
    descriptionEn: "CFP Res. 16/2019 Annex V / Ethics Code Art. 8 — non-occasional care or assessment for minors.",
    descriptionEs: "Res. CFP 16/2019 Anexo V / CEPP Art. 8 — atención o evaluación psicológica de menores.",
    bodyPt: `AUTORIZAÇÃO PARA ACOMPANHAMENTO PSICOLÓGICO
NÃO EVENTUAL E/OU AVALIAÇÃO PSICOLÓGICA
DE CRIANÇAS E ADOLESCENTES
(Resolução CFP nº 16/2019 — Anexo V / CEPP Art. 8º)

Eu, _________________________________________________________,
data de nascimento: ____/____/____, portador(a) do documento de
identidade nº: ____________________, domiciliado(a) à:
________________________________________________________________,
responsável legal pela criança/adolescente:
_________________________________________________________,
data de nascimento: ____/____/____, portador(a) do documento de
identidade/certidão de nascimento nº: __________________________,
autorizo o(a) profissional ____________________________________,
psicóloga(o), sob registro CRP ___/__________, a realizar
acompanhamento psicológico não eventual, bem como a realizar as
avaliações psicológicas pertinentes e os encaminhamentos cabíveis,
inclusive por TDICs quando aplicável.

Todas as avaliações, intervenções e documentos produzidos serão
regidos pelos dispositivos legais vigentes, em especial pelo Código
de Ética Profissional do Psicólogo (Resolução CFP nº 10/2005),
Resolução CFP nº 09/2024 e demais Resoluções da Psicologia.

Em especial, serão garantidos à criança ou adolescente o sigilo das
informações e a preservação da dignidade e da intimidade durante a
prestação dos serviços de que trata esta autorização.

_______________, ____/____/______
(Cidade) / (Data)

__________________________________________
Responsável Legal pela Criança ou Adolescente

__________________________________________
Nome completo, CRP e carimbo da Psicóloga(o)`,
    bodyEn: `AUTHORIZATION FOR NON-OCCASIONAL PSYCHOLOGICAL
FOLLOW-UP AND/OR PSYCHOLOGICAL ASSESSMENT
OF CHILDREN AND ADOLESCENTS
(CFP Resolution 16/2019 — Annex V / Ethics Code Art. 8)

I, ____________________________________________________________,
date of birth: ____/____/____, ID no.: ____________________________,
address: ______________________________________________________,
legal guardian of the child/adolescent:
__________________________________________________________,
date of birth: ____/____/____, ID/birth certificate no.: ____________,
authorize professional ________________________________________,
psychologist, CRP ___/__________, to provide non-occasional
psychological follow-up and relevant psychological assessments and
referrals, including via TDICs when applicable.

All assessments, interventions and documents will comply with
applicable law, especially the Professional Ethics Code (CFP Res.
10/2005), Resolution 09/2024 and related Psychology regulations.

Confidentiality, dignity and privacy of the child or adolescent will
be preserved.

_______________, ____/____/______

__________________________________________
Legal Guardian

__________________________________________
Psychologist full name, license and stamp`,
    bodyEs: `AUTORIZACIÓN PARA ACOMPAÑAMIENTO PSICOLÓGICO
NO EVENTUAL Y/O EVALUACIÓN PSICOLÓGICA
DE NIÑOS, NIÑAS Y ADOLESCENTES
(Resolución CFP nº 16/2019 — Anexo V / CEPP Art. 8)

Yo, ___________________________________________________________,
fecha de nacimiento: ____/____/____, documento nº: ______________,
domiciliado(a) en: _____________________________________________,
responsable legal del/de la niño/a/adolescente:
__________________________________________________________,
fecha de nacimiento: ____/____/____, documento/certidão nº: _______,
autorizo al/a la profesional ___________________________________,
psicólogo(a), CRP ___/__________, a realizar acompañamiento
psicológico no eventual, evaluaciones pertinentes y derivaciones,
inclusive por TDICs cuando aplique.

Todas las evaluaciones, intervenciones y documentos se regirán por
la legislación vigente, especialmente el Código de Ética (Res. CFP
nº 10/2005), Resolución 09/2024 y demás normas de la Psicología.

Se garantizarán sigilo, dignidad e intimidad del/de la niño/a/adolescente.

_______________, ____/____/______

__________________________________________
Responsable Legal

__________________________________________
Nombre completo, CRP y sello del/de la Psicólogo(a)`,
  },
  {
    id: "ADOLESCENT_ASSENT",
    titlePt: "Assentimento do adolescente (12–17 anos)",
    titleEn: "Adolescent assent (ages 12–17)",
    titleEs: "Asentimiento del adolescente (12–17 años)",
    descriptionPt: "Recomendado pelo CFP — concordância do adolescente em linguagem acessível, complementar à autorização do responsável.",
    descriptionEn: "CFP recommended — adolescent agreement in accessible language, complementing guardian authorization.",
    descriptionEs: "Recomendado por el CFP — acuerdo del adolescente en lenguaje accesible, complementando la autorización del responsable.",
    bodyPt: `TERMO DE ASSENTIMENTO DO ADOLESCENTE
(12 a 17 anos)

Olá! Este documento explica, de forma simples, o que é o atendimento
psicológico e pede sua concordância para participar.

Nome do(a) adolescente: _______________________________________
Data de nascimento: ____/____/____

Psicóloga(o) responsável: ____________________________________
CRP: _________________

O que é o atendimento psicológico?
É um espaço de conversa com uma profissional de psicologia para
ajudar no seu bem-estar emocional. Pode ser presencial ou por
videoconferência (atendimento online).

O que você precisa saber:
  • O que você contar em sessão é sigiloso (privado), exceto se
    houver risco grave para você ou outra pessoa;
  • Você pode fazer perguntas a qualquer momento;
  • Você pode parar o atendimento quando quiser;
  • Se for online, escolha um lugar calmo e privado para as sessões;
  • Suas informações ficam registradas em prontuário eletrônico seguro.

Seus pais/responsáveis já autorizaram seu acompanhamento. Este
termo registra que VOCÊ também concorda em participar.

Declaro que entendi as informações acima e concordo em participar
do atendimento psicológico.

_______________, ____/____/______

__________________________________________
Assinatura do(a) Adolescente

__________________________________________
Assinatura da Psicóloga(o) — CRP: ___________`,
    bodyEn: `ADOLESCENT ASSENT FORM
(Ages 12 to 17)

Hello! This document simply explains psychological care and asks
for your agreement to participate.

Adolescent name: _____________________________________________
Date of birth: ____/____/____

Psychologist: __________________________________________________
License (CRP): _________________

What is psychological care?
It is a space to talk with a psychology professional to support your
emotional well-being. It may be in person or via videoconference.

What you should know:
  • What you share in sessions is confidential, except in cases of
    serious risk to you or others;
  • You may ask questions at any time;
  • You may stop care whenever you wish;
  • If online, choose a calm, private place for sessions;
  • Your information is stored in a secure electronic chart.

Your parents/guardians have already authorized your care. This form
records that YOU also agree to participate.

I declare that I understood the information above and agree to
participate in psychological care.

_______________, ____/____/______

__________________________________________
Adolescent signature

__________________________________________
Psychologist signature — License: ___________`,
    bodyEs: `TERMO DE ASENTIMIENTO DEL/LA ADOLESCENTE
(12 a 17 años)

¡Hola! Este documento explica de forma simple qué es la atención
psicológica y pide tu acuerdo para participar.

Nombre del/de la adolescente: __________________________________
Fecha de nacimiento: ____/____/____

Psicólogo(a) responsable: _____________________________________
CRP: _________________

¿Qué es la atención psicológica?
Es un espacio de conversación con un/a profesional de psicología para
ayudar en tu bienestar emocional. Puede ser presencial o por
videoconferencia (atención online).

Lo que debes saber:
  • Lo que compartas en sesión es confidencial, salvo riesgo grave
    para ti u otra persona;
  • Puedes hacer preguntas en cualquier momento;
  • Puedes interrumpir la atención cuando quieras;
  • Si es online, elige un lugar tranquilo y privado;
  • Tu información queda en un prontuario electrónico seguro.

Tus padres/responsables ya autorizaron tu acompañamiento. Este
término registra que TÚ también estás de acuerdo.

Declaro haber entendido la información anterior y acepto participar
en la atención psicológica.

_______________, ____/____/______

__________________________________________
Firma del/de la Adolescente

__________________________________________
Firma del/de la Psicólogo(a) — CRP: _________`,
  },
  {
    id: "SESSION_RECORDING_CONSENT",
    titlePt: "Consentimento para gravação de sessão",
    titleEn: "Session recording consent",
    titleEs: "Consentimiento para grabación de sesión",
    descriptionPt: "Res. CFP 13/2022 Art. 11 — consentimento livre, prévio, informado e por escrito para gravação áudio/vídeo.",
    descriptionEn: "CFP Res. 13/2022 Art. 11 — free, prior, informed written consent for audio/video recording.",
    descriptionEs: "Res. CFP 13/2022 Art. 11 — consentimiento libre, previo, informado y por escrito para grabación.",
    bodyPt: `TERMO DE CONSENTIMENTO PARA GRAVAÇÃO DE SESSÕES
DE PSICOTERAPIA
(Resolução CFP nº 13/2022 — Art. 11)

Psicóloga(o): _______________________________________________
CRP: _________________

Paciente: ___________________________________________________
CPF: _____________________  Data de nascimento: _____________

Responsável legal (se menor de 18 anos ou interditado):
Nome: _________________________  Parentesco: _______________

1. FINALIDADE DA GRAVAÇÃO

Declaro que fui informado(a) de que a gravação das sessões de
psicoterapia (por áudio e/ou vídeo) será realizada pela seguinte
finalidade/método de trabalho:

________________________________________________________________
________________________________________________________________

2. CONDIÇÕES

  a) A gravação é justificada pela finalidade ou método descrito acima;
  b) O sigilo das gravações será garantido conforme normas da Psicologia;
  c) Os registros compõem o registro documental/prontuário (Res. CFP 001/2009);
  d) É vedado o uso dos registros para finalidades alheias às descritas;
  e) Em atendimento a criança, adolescente ou interditado, este
     consentimento do responsável legal é complementado pela anuência
     do(a) paciente, quando aplicável.

3. DECLARAÇÃO DE CONSENTIMENTO

Consinto, de forma livre, prévia, informada e por escrito, com a
gravação das sessões de psicoterapia nas condições descritas.

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
Paciente (ou Responsável Legal)

_______________________________________________
Psicóloga(o) — CRP: _____________________________`,
    bodyEn: `CONSENT FOR PSYCHOTHERAPY SESSION RECORDING
(CFP Resolution 13/2022 — Art. 11)

Psychologist: _________________________________________________
License (CRP): _________________

Patient: ______________________________________________________
ID: __________________  Date of birth: ________________________

Legal guardian (if under 18 or legally incapacitated):
Name: _________________________  Relationship: _______________

1. PURPOSE OF RECORDING

I declare that I have been informed that psychotherapy sessions
will be recorded (audio and/or video) for the following purpose/method:

________________________________________________________________
________________________________________________________________

2. CONDITIONS

  a) Recording is justified by the purpose or method described above;
  b) Confidentiality of recordings is guaranteed per Psychology regulations;
  c) Recordings form part of the chart/documentation (CFP Res. 001/2009);
  d) Use for purposes other than those described is prohibited;
  e) For minors or legally incapacitated persons, guardian consent is
     complemented by patient assent when applicable.

3. CONSENT DECLARATION

I freely, priorly, knowingly and in writing consent to session recording
under the described conditions.

Place and date: ___________________, __________ __, ______.

_______________________________________________
Patient (or Legal Guardian)

_______________________________________________
Psychologist — License: __________________________`,
    bodyEs: `CONSENTIMIENTO PARA GRABACIÓN DE SESIONES
DE PSICOTERAPIA
(Resolución CFP nº 13/2022 — Art. 11)

Psicólogo(a): _________________________________________________
CRP: _________________

Paciente: _____________________________________________________
CPF: _____________________  Fecha de nacimiento: ______________

Responsable legal (si menor de 18 años o interdicto):
Nombre: _______________________  Parentesco: ___________________

1. FINALIDAD DE LA GRABACIÓN

Declaro haber sido informado(a) de que las sesiones de psicoterapia
( audio y/o video) serán grabadas por la siguiente finalidad/método:

________________________________________________________________
________________________________________________________________

2. CONDICIONES

  a) La grabación está justificada por la finalidad o método descrito;
  b) Se garantiza el sigilo conforme normas de la Psicología;
  c) Los registros forman parte del prontuario (Res. CFP 001/2009);
  d) Está vedado el uso para finalidades ajenas a las descritas;
  e) En menores o interdictos, el consentimiento del responsable se
     complementa con el asentimiento del/de la paciente cuando aplique.

3. DECLARACIÓN DE CONSENTIMIENTO

Consiento libre, previa, informada y por escrito con la grabación de
sesiones en las condiciones descritas.

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
Paciente (o Responsable Legal)

_______________________________________________
Psicólogo(a) — CRP: _____________________________`,
  },
  {
    id: "CONTRACT_ADDENDUM",
    titlePt: "Termo aditivo ao contrato",
    titleEn: "Contract addendum",
    titleEs: "Término aditivo al contrato",
    descriptionPt: "Recomendado pelos CRPs — alterações de valores, cláusulas ou condições do contrato de prestação de serviços.",
    descriptionEn: "Recommended by Regional Psychology Councils — changes to fees, clauses or service agreement terms.",
    descriptionEs: "Recomendado por los CRPs — cambios de valores, cláusulas o condiciones del contrato.",
    bodyPt: `TERMO ADITIVO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS
PSICOLÓGICOS

Referência: Contrato original firmado em ____/____/____ entre:

CONTRATADA: _________________________________________________
CRP: _________________

CONTRATANTE: ________________________________________________
CPF: _____________________

As partes, de comum acordo, resolvem aditar o contrato original nos
seguintes termos:

1. ALTERAÇÕES ACORDADAS

( ) Reajuste de honorários: novo valor R$ __________ por sessão,
    a partir de ____/____/____.

( ) Alteração de frequência/horários: ___________________________
_____________________________________________________________

( ) Alteração de modalidade de atendimento: ____________________
_____________________________________________________________

( ) Inclusão/exclusão de cláusula: ______________________________
_____________________________________________________________

( ) Outras alterações: _________________________________________
_____________________________________________________________

2. DISPOSIÇÕES

2.1. Permanecem inalteradas todas as demais cláusulas do contrato
     original não modificadas por este termo aditivo.
2.2. Este termo aditivo passa a integrar o contrato original para
     todos os efeitos legais.

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
CONTRATANTE

_______________________________________________
CONTRATADA — CRP: _____________________________`,
    bodyEn: `ADDENDUM TO PSYCHOLOGICAL SERVICES AGREEMENT

Reference: Original agreement dated ____/____/____ between:

PROVIDER: ___________________________________________________
License: _________________

CLIENT: ______________________________________________________
ID: _____________________

The parties agree to amend the original agreement as follows:

1. AGREED CHANGES

( ) Fee adjustment: new fee __________ per session, effective ____/____/____.
( ) Schedule/frequency change: _________________________________
( ) Care modality change: ______________________________________
( ) Clause added/removed: ______________________________________
( ) Other changes: _____________________________________________

2. PROVISIONS

2.1. All unmodified clauses of the original agreement remain in effect.
2.2. This addendum forms part of the original agreement.

Place and date: ___________________, __________ __, ______.

_______________________________________________
CLIENT

_______________________________________________
PROVIDER — License: ____________________________`,
    bodyEs: `TÉRMINO ADITIVO AL CONTRATO DE PRESTACIÓN DE
SERVICIOS PSICOLÓGICOS

Referencia: Contrato original firmado el ____/____/____ entre:

CONTRATADA: _________________________________________________
CRP: _________________

CONTRATANTE: ________________________________________________
CPF: _____________________

Las partes acuerdan modificar el contrato original en los siguientes términos:

1. CAMBIOS ACORDADOS

( ) Reajuste de honorarios: nuevo valor R$ __________ por sesión,
    a partir de ____/____/____.
( ) Cambio de frecuencia/horarios: _____________________________
( ) Cambio de modalidad: _______________________________________
( ) Inclusión/exclusión de cláusula: ____________________________
( ) Otros cambios: _____________________________________________

2. DISPOSICIONES

2.1. Permanecen inalteradas las demás cláusulas no modificadas.
2.2. Este término aditivo integra el contrato original.

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
CONTRATANTE

_______________________________________________
CONTRATADA — CRP: _____________________________`,
  },
  {
    id: "SERVICE_CLOSURE_RECORD",
    titlePt: "Registro de encerramento do atendimento",
    titleEn: "Service closure record",
    titleEs: "Registro de cierre de la atención",
    descriptionPt: "Res. CFP 001/2009 Art. 2º, IV — registro obrigatório de encerramento no prontuário.",
    descriptionEn: "CFP Res. 001/2009 Art. 2, IV — mandatory closure record in the chart.",
    descriptionEs: "Res. CFP 001/2009 Art. 2, IV — registro obligatorio de cierre en el prontuario.",
    bodyPt: `REGISTRO DE ENCERRAMENTO DO ATENDIMENTO PSICOLÓGICO
(Resolução CFP nº 001/2009 — Art. 2º, IV)

Paciente: ___________________________________________________
CPF: _____________________

Psicóloga(o): _______________________________________________
CRP: _________________

Período de acompanhamento: de ____/____/____ a ____/____/____
Natureza do serviço: __________________________________________
Modalidade: ( ) presencial  ( ) TDICs  ( ) híbrida

Motivo do encerramento:
( ) Conclusão do processo / objetivos alcançados
( ) Solicitação do(a) paciente
( ) Encaminhamento a outro profissional/serviço
( ) Incompatibilidade técnica com modalidade remota
( ) Outro: ____________________________________________________

Síntese da evolução e condição ao encerramento:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

Encaminhamentos realizados (se houver):
_____________________________________________________________

Orientações fornecidas ao(à) paciente/responsável:
_____________________________________________________________

Recomenda-se retorno? ( ) Sim  ( ) Não
Prazo sugerido para retorno: __________________________________

Data do encerramento: ____/____/____

_______________________________________________
Assinatura da Psicóloga(o) — CRP: _____________________________`,
    bodyEn: `PSYCHOLOGICAL CARE CLOSURE RECORD
(CFP Resolution 001/2009 — Art. 2, IV)

Patient: ______________________________________________________
ID: _____________________

Psychologist: _________________________________________________
License: _________________

Follow-up period: from ____/____/____ to ____/____/____
Service type: _________________________________________________
Modality: ( ) in person  ( ) TDICs  ( ) hybrid

Reason for closure:
( ) Process completion / goals achieved
( ) Patient request
( ) Referral to another professional/service
( ) Technical incompatibility with remote modality
( ) Other: ____________________________________________________

Summary of progress and condition at closure:
_____________________________________________________________
_____________________________________________________________

Referrals (if any):
_____________________________________________________________

Guidance provided to patient/guardian:
_____________________________________________________________

Follow-up recommended? ( ) Yes  ( ) No
Suggested return timeframe: ____________________________________

Closure date: ____/____/____

_______________________________________________
Psychologist signature — License: _____________________________`,
    bodyEs: `REGISTRO DE CIERRE DE LA ATENCIÓN PSICOLÓGICA
(Resolución CFP nº 001/2009 — Art. 2, IV)

Paciente: _____________________________________________________
CPF: _____________________

Psicólogo(a): _________________________________________________
CRP: _________________

Período de seguimiento: de ____/____/____ a ____/____/____
Naturaleza del servicio: _______________________________________
Modalidad: ( ) presencial  ( ) TDICs  ( ) híbrida

Motivo del cierre:
( ) Conclusión del proceso / objetivos alcanzados
( ) Solicitud del/de la paciente
( ) Derivación a otro profesional/servicio
( ) Incompatibilidad técnica con modalidad remota
( ) Otro: _____________________________________________________

Síntesis de la evolución y condición al cierre:
_____________________________________________________________
_____________________________________________________________

Derivaciones (si las hay):
_____________________________________________________________

Orientaciones al/a la paciente/responsable:
_____________________________________________________________

¿Se recomienda retorno? ( ) Sí  ( ) No
Plazo sugerido: _______________________________________________

Fecha de cierre: ____/____/____

_______________________________________________
Firma del/de la Psicólogo(a) — CRP: ____________________________`,
  },
  {
    id: "ATTENDANCE_DECLARATION",
    titlePt: "Declaração de comparecimento",
    titleEn: "Attendance declaration",
    titleEs: "Declaración de asistencia",
    descriptionPt: "Documento psicológico emitido ao paciente — Res. CFP 06/2019 (sem cobrança indevida pelo documento do serviço).",
    descriptionEn: "Psychological document for the patient — CFP Res. 06/2019 (no improper fee for service-related documents).",
    descriptionEs: "Documento psicológico para el paciente — Res. CFP 06/2019 (sin cobro indebido por documentos del servicio).",
    bodyPt: `DECLARAÇÃO DE COMPARECIMENTO

Declaro, para os devidos fins, que ___________________________________,
portador(a) do CPF nº _____________________, compareceu a sessão de
atendimento psicológico na data de ____/____/____, no horário das
_____:_____ às _____:_____, na modalidade ( ) presencial  ( ) TDICs
(videoconferência).

Natureza do serviço: __________________________________________

Observações (opcional): _______________________________________
_____________________________________________________________

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
_______________________________________________
Nome completo da Psicóloga(o)
CRP: _________________`,
    bodyEn: `ATTENDANCE DECLARATION

I declare, for appropriate purposes, that ____________________________,
ID no. _____________________, attended a psychological session on
____/____/____, from _____:_____ to _____:_____, via ( ) in person
( ) TDICs (videoconference).

Service type: _________________________________________________

Notes (optional): _____________________________________________

Place and date: ___________________, __________ __, ______.

_______________________________________________
Psychologist full name
License (CRP): _________________`,
    bodyEs: `DECLARACIÓN DE ASISTENCIA

Declaro, para los fines pertinentes, que ____________________________,
CPF nº _____________________, asistió a sesión de atención psicológica
el ____/____/____, de _____:_____ a _____:_____, en modalidad
( ) presencial  ( ) TDICs (videoconferencia).

Naturaleza del servicio: ________________________________________

Observaciones (opcional): ______________________________________

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
Nombre completo del/de la Psicólogo(a)
CRP: _________________`,
  },
  {
    id: "PSYCHOLOGICAL_REPORT",
    titlePt: "Relatório psicológico",
    titleEn: "Psychological report",
    titleEs: "Informe psicológico",
    descriptionPt: "Res. CFP 06/2019 — documento psicológico escrito (relatório) conforme demanda e destinatário.",
    descriptionEn: "CFP Res. 06/2019 — written psychological document (report) per demand and recipient.",
    descriptionEs: "Res. CFP 06/2019 — documento psicológico escrito (informe) según demanda y destinatario.",
    bodyPt: `RELATÓRIO PSICOLÓGICO
(Resolução CFP nº 06/2019)

Identificação do(a) paciente: __________________________________
CPF: _____________________  Data de nascimento: _____________

Psicóloga(o): _______________________________________________
CRP: _________________

Finalidade / destinatário: ____________________________________
Período de acompanhamento: de ____/____/____ a ____/____/____

1. DEMANDA / MOTIVO DO ENCAMINHAMENTO
_____________________________________________________________
_____________________________________________________________

2. PROCEDIMENTOS UTILIZADOS
(Entrevistas, instrumentos, técnicas, modalidade presencial/TDICs)
_____________________________________________________________
_____________________________________________________________

3. ANÁLISE / RESULTADOS
_____________________________________________________________
_____________________________________________________________

4. CONCLUSÃO
_____________________________________________________________
_____________________________________________________________

5. ENCAMINHAMENTOS (se houver)
_____________________________________________________________

Local e data: ___________________, _____ de __________ de _______.

_______________________________________________
Assinatura e carimbo CRP`,
    bodyEn: `PSYCHOLOGICAL REPORT
(CFP Resolution 06/2019)

Patient identification: _______________________________________
ID: __________________  Date of birth: ________________________

Psychologist: _________________________________________________
License: _________________

Purpose / recipient: ___________________________________________
Follow-up period: from ____/____/____ to ____/____/____

1. REASON FOR REFERRAL
_____________________________________________________________

2. PROCEDURES USED
(Interviews, instruments, techniques, in-person/TDIC modality)
_____________________________________________________________

3. ANALYSIS / RESULTS
_____________________________________________________________

4. CONCLUSION
_____________________________________________________________

5. REFERRALS (if any)
_____________________________________________________________

Place and date: ___________________, __________ __, ______.

_______________________________________________
Signature and license stamp`,
    bodyEs: `INFORME PSICOLÓGICO
(Resolución CFP nº 06/2019)

Identificación del/de la paciente: ______________________________
CPF: _____________________  Fecha de nacimiento: ______________

Psicólogo(a): _________________________________________________
CRP: _________________

Finalidad / destinatario: _____________________________________
Período de seguimiento: de ____/____/____ a ____/____/____

1. DEMANDA / MOTIVO DE LA DERIVACIÓN
_____________________________________________________________

2. PROCEDIMIENTOS UTILIZADOS
(Entrevistas, instrumentos, técnicas, modalidad presencial/TDICs)
_____________________________________________________________

3. ANÁLISIS / RESULTADOS
_____________________________________________________________

4. CONCLUSIÓN
_____________________________________________________________

5. DERIVACIONES (si las hay)
_____________________________________________________________

Lugar y fecha: ___________________, _____ de __________ de _______.

_______________________________________________
Firma y sello profesional`,
  },
  {
    id: "REFERRAL_NETWORK",
    titlePt: "Registro de encaminhamento à rede de proteção",
    titleEn: "Referral to protection network record",
    titleEs: "Registro de derivación a la red de protección",
    descriptionPt: "Res. CFP 09/2024 Art. 5º §2 — registro obrigatório de articulações com a rede presencial no prontuário.",
    descriptionEn: "CFP Res. 09/2024 Art. 5 §2 — mandatory record of in-person network coordination in chart.",
    descriptionEs: "Res. CFP 09/2024 Art. 5 §2 — registro obligatorio de articulaciones con la red presencial.",
    bodyPt: `REGISTRO DE ENCAMINHAMENTO / ARTICULAÇÃO COM REDE DE PROTEÇÃO
(Resolução CFP nº 09/2024 — Art. 5º, §2)

Paciente: ___________________________________________________
Data/hora: ____/____/____  _____:_____

Situação identificada:
( ) Risco à integridade / morte
( ) Violência ou violação de direitos
( ) Ameaça ou privação de liberdade
( ) Urgência/emergência clínica
( ) Desastre natural
( ) Outro: ____________________________________________________

Descrição da situação:
_____________________________________________________________
_____________________________________________________________

Ações realizadas:
_____________________________________________________________
_____________________________________________________________

Serviços/instituições contactados:
( ) SAMU 192  ( ) CVV 188  ( ) CAPS  ( ) Conselho Tutelar
( ) Delegacia  ( ) UPA/Pronto-socorro  ( ) Outro: _______________

Encaminhamento para atendimento presencial: ( ) Sim  ( ) Não
Destino: _____________________________________________________

Comunicação ao(à) paciente/responsável: ( ) Sim  ( ) Não
Data/hora da comunicação: ____/____/____  _____:_____

Registrado por: ______________________________________________
CRP: _________________`,
    bodyEn: `REFERRAL / PROTECTION NETWORK RECORD
(CFP Resolution 09/2024 — Art. 5, §2)

Patient: ______________________________________________________
Date/time: ____/____/____  _____:_____

Situation identified:
( ) Integrity/life risk
( ) Violence or rights violation
( ) Threat or deprivation of liberty
( ) Clinical urgency/emergency
( ) Natural disaster
( ) Other: ____________________________________________________

Description:
_____________________________________________________________

Actions taken:
_____________________________________________________________

Services/institutions contacted:
( ) SAMU 192  ( ) CVV 188  ( ) CAPS  ( ) Child Protection Council
( ) Police  ( ) ER/Urgent care  ( ) Other: _______________________

Referred for in-person care: ( ) Yes  ( ) No
Destination: __________________________________________________

Patient/guardian notified: ( ) Yes  ( ) No
Notification date/time: ____/____/____  _____:_____

Recorded by: __________________________________________________
License: _________________`,
    bodyEs: `REGISTRO DE DERIVACIÓN / RED DE PROTECCIÓN
(Resolución CFP nº 09/2024 — Art. 5, §2)

Paciente: _____________________________________________________
Fecha/hora: ____/____/____  _____:_____

Situación identificada:
( ) Riesgo a la integridad / muerte
( ) Violencia o violación de derechos
( ) Amenaza o privación de libertad
( ) Urgencia/emergencia clínica
( ) Desastre natural
( ) Otro: _____________________________________________________

Descripción:
_____________________________________________________________

Acciones realizadas:
_____________________________________________________________

Servicios/instituciones contactados:
( ) SAMU 192  ( ) CVV 188  ( ) CAPS  ( ) Consejo Tutelar
( ) Delegacia  ( ) Urgencias  ( ) Otro: _________________________

Derivación a atención presencial: ( ) Sí  ( ) No
Destino: ______________________________________________________

Comunicación al/a la paciente/responsable: ( ) Sí  ( ) No
Fecha/hora: ____/____/____  _____:_____

Registrado por: _______________________________________________
CRP: _________________`,
  },
  {
    id: "EMERGENCY_RECORD",
    titlePt: "Registro de urgência/emergência em TDICs",
    titleEn: "Emergency record during TDIC session",
    titleEs: "Registro de urgencia/emergencia en TDICs",
    descriptionPt: "Res. CFP 09/2024 Art. 4º, VI e Art. 5º — protocolo de contingência e registro em sessão remota.",
    descriptionEn: "CFP Res. 09/2024 Art. 4, VI and Art. 5 — contingency protocol and record during remote session.",
    descriptionEs: "Res. CFP 09/2024 Art. 4, VI y Art. 5 — protocolo de contingencia y registro en sesión remota.",
    bodyPt: `REGISTRO DE URGÊNCIA/EMERGÊNCIA EM ATENDIMENTO POR TDICs
(Resolução CFP nº 09/2024 — Arts. 4º, VI e 5º)

Paciente: ___________________________________________________
Data/hora da sessão: ____/____/____  _____:_____
Meio de atendimento: ( ) videoconferência  ( ) mensagem  ( ) outro

Situação de risco identificada:
( ) Ideação/comportamento suicida
( ) Risco de autolesão
( ) Risco à integridade de terceiros
( ) Violência doméstica / maus-tratos
( ) Crise aguda / descompensação
( ) Perda de conexão com paciente em risco
( ) Outro: ____________________________________________________

Descrição detalhada:
_____________________________________________________________
_____________________________________________________________

Medidas imediatas adotadas durante a sessão:
_____________________________________________________________
_____________________________________________________________

Localização do(a) paciente (se conhecida): ______________________
Contato de emergência acionado: ______________________________
Telefone de emergência acionado: ( ) SAMU 192  ( ) CVV 188
( ) Familiar: _________________  ( ) Outro: ___________________

Encaminhamento para rede presencial:
Destino: _____________________________________________________
( ) UPA/Pronto-socorro  ( ) CAPS  ( ) Hospital  ( ) Delegacia
( ) Conselho Tutelar  ( ) Outro: ______________________________

Continuidade do acompanhamento remoto:
( ) Sim  ( ) Não  ( ) Suspenso temporariamente

Observações / plano de segurança acordado:
_____________________________________________________________
_____________________________________________________________

Psicóloga(o): _______________________________________________
CRP: _________________  Data do registro: ____/____/____`,
    bodyEn: `EMERGENCY RECORD DURING TDIC SESSION
(CFP Resolution 09/2024 — Arts. 4, VI and 5)

Patient: ______________________________________________________
Session date/time: ____/____/____  _____:_____
Medium: ( ) videoconference  ( ) messaging  ( ) other

Risk situation identified:
( ) Suicidal ideation/behavior
( ) Self-harm risk
( ) Risk to third parties
( ) Domestic violence / abuse
( ) Acute crisis / decompensation
( ) Lost connection with patient at risk
( ) Other: ____________________________________________________

Detailed description:
_____________________________________________________________

Immediate measures during session:
_____________________________________________________________

Patient location (if known): ____________________________________
Emergency contact notified: ___________________________________
Emergency phone: ( ) SAMU 192  ( ) CVV 188
( ) Family: _________________  ( ) Other: ______________________

Referral to in-person network:
Destination: __________________________________________________
( ) ER/Urgent care  ( ) CAPS  ( ) Hospital  ( ) Police
( ) Child Protection Council  ( ) Other: ________________________

Remote follow-up continues:
( ) Yes  ( ) No  ( ) Temporarily suspended

Notes / agreed safety plan:
_____________________________________________________________

Psychologist: _________________________________________________
License: _________________  Record date: ____/____/____`,
    bodyEs: `REGISTRO DE URGENCIA/EMERGENCIA EN ATENCIÓN POR TDICs
(Resolución CFP nº 09/2024 — Arts. 4, VI y 5)

Paciente: _____________________________________________________
Fecha/hora de la sesión: ____/____/____  _____:_____
Medio: ( ) videoconferencia  ( ) mensaje  ( ) otro

Situación de riesgo identificada:
( ) Ideación/conducta suicida
( ) Riesgo de autolesión
( ) Riesgo a terceros
( ) Violencia doméstica / maltrato
( ) Crisis aguda / descompensación
( ) Pérdida de conexión con paciente en riesgo
( ) Otro: _____________________________________________________

Descripción detallada:
_____________________________________________________________

Medidas inmediatas durante la sesión:
_____________________________________________________________

Ubicación del/de la paciente (si se conoce): ____________________
Contacto de emergencia activado: ______________________________
Teléfono de emergencia: ( ) SAMU 192  ( ) CVV 188
( ) Familiar: _________________  ( ) Otro: ______________________

Derivación a red presencial:
Destino: ______________________________________________________
( ) Urgencias  ( ) CAPS  ( ) Hospital  ( ) Delegacia
( ) Consejo Tutelar  ( ) Otro: _________________________________

Continuidad del seguimiento remoto:
( ) Sí  ( ) No  ( ) Suspendido temporalmente

Observaciones / plan de seguridad acordado:
_____________________________________________________________

Psicólogo(a): _________________________________________________
CRP: _________________  Fecha del registro: ____/____/____`,
  },
];
