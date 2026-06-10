// src/app/privacy/page.tsx
// Política de Privacidade — LGPD + GDPR compliant
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Política de Privacidade | Privacy Policy | Doctor8",
  description: "Política de Privacidade da Doctor8 — LGPD e GDPR compliant.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: {
      pt: "1. Identificação do Controlador",
      en: "1. Controller Identification",
      es: "1. Identificación del Responsable",
    },
    content: {
      pt: `<p>A <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, pessoa jurídica de direito privado, sediada na Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, CEP 30.320-595, inscrita no CNPJ sob o nº 20.251.527/0001-04, proprietária dos direitos autorais e responsável pelo programa de computador (software) disponibilizado por meio dos sites <strong>doctor8.com.br</strong> e <strong>doctor8.org</strong>, denominado <strong>DOCTOR8</strong>, é a Controladora dos dados pessoais tratados nesta Política.</p>
      <p class="mt-3">Para dúvidas ou exercício de direitos, entre em contato com nosso Encarregado (DPO): <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      en: `<p><strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, a Brazilian private legal entity headquartered at Rua Jornalista Djalma Andrade, nº 1505, Room 01, Belvedere, Belo Horizonte/MG, Brazil, ZIP 30.320-595, CNPJ 20.251.527/0001-04, owner of the software available at <strong>doctor8.com.br</strong> and <strong>doctor8.org</strong>, named <strong>DOCTOR8</strong>, is the Data Controller under this Policy.</p>
      <p class="mt-3">For questions or to exercise your rights, contact our Data Protection Officer (DPO): <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      es: `<p><strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)</strong>, persona jurídica de derecho privado, con sede en Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, Brasil, CEP 30.320-595, CNPJ 20.251.527/0001-04, propietaria del software disponible en <strong>doctor8.com.br</strong> y <strong>doctor8.org</strong>, denominado <strong>DOCTOR8</strong>, es la Responsable del tratamiento conforme a esta Política.</p>
      <p class="mt-3">Para dudas o ejercicio de derechos, contacte a nuestro Delegado de Protección de Datos (DPO): <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
    },
  },
  {
    title: {
      pt: "2. Conceitos Essenciais",
      en: "2. Key Definitions",
      es: "2. Definiciones Clave",
    },
    content: {
      pt: `<ul class="list-disc pl-5 space-y-2">
        <li><strong>DOCTOR8:</strong> software online de gestão de dados pessoais relacionados à saúde, disponível em doctor8.com.br e doctor8.org.</li>
        <li><strong>Usuário Paciente:</strong> pessoa que utiliza o DOCTOR8 para obter serviços de saúde e armazenar seu prontuário eletrônico.</li>
        <li><strong>Usuário Profissional de Saúde:</strong> profissional cadastrado para prestar serviços de saúde via DOCTOR8.</li>
        <li><strong>Prontuário Eletrônico:</strong> conjunto de dados pessoais e informações de saúde armazenados na plataforma.</li>
        <li><strong>Telessaúde / Telemedicina / Teleconsulta:</strong> prestação de serviços e consultas de saúde à distância por meios tecnológicos.</li>
        <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados (Lei nº 13.709/2018), aplicável no Brasil.</li>
        <li><strong>GDPR:</strong> Regulamento Geral de Proteção de Dados da União Europeia (Regulamento 2016/679).</li>
      </ul>`,
      en: `<ul class="list-disc pl-5 space-y-2">
        <li><strong>DOCTOR8:</strong> Online health data management software available at doctor8.com.br and doctor8.org.</li>
        <li><strong>Patient User:</strong> Person who uses DOCTOR8 to access health services and store their electronic health record.</li>
        <li><strong>Healthcare Professional User:</strong> Registered professional providing health services through DOCTOR8.</li>
        <li><strong>Electronic Health Record:</strong> Set of personal data and health information stored on the platform.</li>
        <li><strong>Telehealth / Telemedicine / Teleconsultation:</strong> Provision of health services and consultations remotely via technology.</li>
        <li><strong>LGPD:</strong> Brazilian General Data Protection Law (Law No. 13.709/2018).</li>
        <li><strong>GDPR:</strong> European Union General Data Protection Regulation (Regulation 2016/679).</li>
      </ul>`,
      es: `<ul class="list-disc pl-5 space-y-2">
        <li><strong>DOCTOR8:</strong> Software en línea de gestión de datos de salud disponible en doctor8.com.br y doctor8.org.</li>
        <li><strong>Usuario Paciente:</strong> Persona que usa DOCTOR8 para acceder a servicios de salud y almacenar su historial médico electrónico.</li>
        <li><strong>Usuario Profesional de Salud:</strong> Profesional registrado para prestar servicios de salud a través de DOCTOR8.</li>
        <li><strong>Historia Clínica Electrónica:</strong> Conjunto de datos personales e información de salud almacenados en la plataforma.</li>
        <li><strong>Telesalud / Telemedicina / Teleconsulta:</strong> Prestación de servicios de salud y consultas a distancia mediante tecnología.</li>
        <li><strong>LGPD:</strong> Ley General de Protección de Datos de Brasil (Ley nº 13.709/2018).</li>
        <li><strong>GDPR:</strong> Reglamento General de Protección de Datos de la Unión Europea (Reglamento 2016/679).</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "3. Dados Coletados e Finalidades",
      en: "3. Data Collected and Purposes",
      es: "3. Datos Recopilados y Finalidades",
    },
    content: {
      pt: `<p class="mb-3">Coletamos dados pessoais nas seguintes situações:</p>
      <table class="w-full border-collapse text-xs mt-2">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Categoria</th><th class="border border-slate-200 p-2 text-left">Dados</th><th class="border border-slate-200 p-2 text-left">Finalidade</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2">Cadastro</td><td class="border border-slate-200 p-2">Nome, e-mail, CPF/RG, data de nascimento, telefone, endereço, foto</td><td class="border border-slate-200 p-2">Criação e gestão de conta</td></tr>
          <tr><td class="border border-slate-200 p-2">Saúde (dados sensíveis)</td><td class="border border-slate-200 p-2">Tipo sanguíneo, alergias, doenças crônicas, medicamentos, histórico clínico, sinais vitais</td><td class="border border-slate-200 p-2">Prestação de serviços de saúde e prontuário eletrônico</td></tr>
          <tr><td class="border border-slate-200 p-2">Profissional</td><td class="border border-slate-200 p-2">Registro profissional (CRM, CRP, etc.), especialidade, currículo</td><td class="border border-slate-200 p-2">Verificação e exibição de perfil</td></tr>
          <tr><td class="border border-slate-200 p-2">Pagamento</td><td class="border border-slate-200 p-2">Dados de cartão (processados pelo Stripe), histórico de transações</td><td class="border border-slate-200 p-2">Processamento de pagamentos</td></tr>
          <tr><td class="border border-slate-200 p-2">Navegação</td><td class="border border-slate-200 p-2">IP, cookies, páginas visitadas, dispositivo</td><td class="border border-slate-200 p-2">Segurança, melhorias e análises</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">Dados de saúde são tratados como dados sensíveis nos termos do Art. 11 da LGPD e Art. 9º do GDPR, com base no consentimento explícito e necessidade de prestação de serviços de saúde.</p>`,
      en: `<p class="mb-3">We collect personal data in the following situations:</p>
      <table class="w-full border-collapse text-xs mt-2">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Category</th><th class="border border-slate-200 p-2 text-left">Data</th><th class="border border-slate-200 p-2 text-left">Purpose</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2">Registration</td><td class="border border-slate-200 p-2">Name, email, national ID, date of birth, phone, address, photo</td><td class="border border-slate-200 p-2">Account creation and management</td></tr>
          <tr><td class="border border-slate-200 p-2">Health (sensitive)</td><td class="border border-slate-200 p-2">Blood type, allergies, chronic conditions, medications, clinical history, vital signs</td><td class="border border-slate-200 p-2">Healthcare service provision and electronic health record</td></tr>
          <tr><td class="border border-slate-200 p-2">Professional</td><td class="border border-slate-200 p-2">Professional registration number, specialty, credentials</td><td class="border border-slate-200 p-2">Verification and profile display</td></tr>
          <tr><td class="border border-slate-200 p-2">Payment</td><td class="border border-slate-200 p-2">Card data (processed by Stripe), transaction history</td><td class="border border-slate-200 p-2">Payment processing</td></tr>
          <tr><td class="border border-slate-200 p-2">Browsing</td><td class="border border-slate-200 p-2">IP, cookies, pages visited, device info</td><td class="border border-slate-200 p-2">Security, improvements, analytics</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">Health data is treated as sensitive data under Art. 11 of LGPD and Art. 9 of GDPR, based on explicit consent and healthcare service necessity.</p>`,
      es: `<p class="mb-3">Recopilamos datos personales en las siguientes situaciones:</p>
      <table class="w-full border-collapse text-xs mt-2">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Categoría</th><th class="border border-slate-200 p-2 text-left">Datos</th><th class="border border-slate-200 p-2 text-left">Finalidad</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2">Registro</td><td class="border border-slate-200 p-2">Nombre, correo electrónico, documento de identidad, fecha de nacimiento, teléfono, dirección, foto</td><td class="border border-slate-200 p-2">Creación y gestión de cuenta</td></tr>
          <tr><td class="border border-slate-200 p-2">Salud (datos sensibles)</td><td class="border border-slate-200 p-2">Tipo de sangre, alergias, enfermedades crónicas, medicamentos, historia clínica, signos vitales</td><td class="border border-slate-200 p-2">Prestación de servicios de salud e historia clínica electrónica</td></tr>
          <tr><td class="border border-slate-200 p-2">Profesional</td><td class="border border-slate-200 p-2">Número de registro profesional, especialidad, credenciales</td><td class="border border-slate-200 p-2">Verificación y visualización de perfil</td></tr>
          <tr><td class="border border-slate-200 p-2">Pago</td><td class="border border-slate-200 p-2">Datos de tarjeta (procesados por Stripe), historial de transacciones</td><td class="border border-slate-200 p-2">Procesamiento de pagos</td></tr>
          <tr><td class="border border-slate-200 p-2">Navegación</td><td class="border border-slate-200 p-2">IP, cookies, páginas visitadas, dispositivo</td><td class="border border-slate-200 p-2">Seguridad, mejoras y análisis</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">Los datos de salud se tratan como datos sensibles conforme al Art. 11 de la LGPD y Art. 9 del GDPR, basándose en el consentimiento explícito y la necesidad de prestación de servicios de salud.</p>`,
    },
  },
  {
    title: {
      pt: "4. Seus Direitos como Titular de Dados",
      en: "4. Your Rights as a Data Subject",
      es: "4. Sus Derechos como Titular de Datos",
    },
    content: {
      pt: `<p class="mb-3">Você tem os seguintes direitos garantidos pela LGPD e pelo GDPR:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Acesso:</strong> solicitar cópia dos seus dados pessoais que mantemos.</li>
        <li><strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
        <li><strong>Exclusão / Anonimização:</strong> solicitar a exclusão ou anonimização dos seus dados, salvo obrigações legais.</li>
        <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e legível por máquina.</li>
        <li><strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento.</li>
        <li><strong>Oposição:</strong> opor-se ao tratamento de seus dados em determinadas situações.</li>
        <li><strong>Restrição:</strong> (GDPR) solicitar limitação do tratamento em casos específicos.</li>
        <li><strong>Reclamação:</strong> apresentar reclamação à ANPD (Brasil) ou autoridade supervisora da UE.</li>
      </ul>
      <p class="mt-3">Para exercer qualquer direito, entre em contato: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      en: `<p class="mb-3">You have the following rights under LGPD and GDPR:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Access:</strong> Request a copy of your personal data we hold.</li>
        <li><strong>Rectification:</strong> Request correction of incomplete, inaccurate, or outdated data.</li>
        <li><strong>Erasure / Anonymization:</strong> Request deletion or anonymization of your data, subject to legal obligations.</li>
        <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
        <li><strong>Withdrawal of consent:</strong> Withdraw your consent at any time.</li>
        <li><strong>Objection:</strong> Object to the processing of your data in certain situations.</li>
        <li><strong>Restriction:</strong> (GDPR) Request limitation of processing in specific cases.</li>
        <li><strong>Complaint:</strong> Lodge a complaint with the ANPD (Brazil) or EU supervisory authority.</li>
      </ul>
      <p class="mt-3">To exercise any right, contact us: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      es: `<p class="mb-3">Tiene los siguientes derechos garantizados por la LGPD y el GDPR:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales que conservamos.</li>
        <li><strong>Rectificación:</strong> Solicitar la corrección de datos incompletos, inexactos o desactualizados.</li>
        <li><strong>Supresión / Anonimización:</strong> Solicitar la eliminación o anonimización de sus datos, salvo obligaciones legales.</li>
        <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado y legible por máquina.</li>
        <li><strong>Revocación del consentimiento:</strong> Retirar su consentimiento en cualquier momento.</li>
        <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos en determinadas situaciones.</li>
        <li><strong>Limitación:</strong> (GDPR) Solicitar la limitación del tratamiento en casos específicos.</li>
        <li><strong>Reclamación:</strong> Presentar una reclamación ante la ANPD (Brasil) o autoridad supervisora de la UE.</li>
      </ul>
      <p class="mt-3">Para ejercer cualquier derecho, contáctenos: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
    },
  },
  {
    title: {
      pt: "5. Compartilhamento de Dados",
      en: "5. Data Sharing",
      es: "5. Compartición de Datos",
    },
    content: {
      pt: `<p>Seus dados pessoais podem ser compartilhados com:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Profissionais de saúde:</strong> para prestação do atendimento solicitado pelo paciente.</li>
        <li><strong>Stripe:</strong> processador de pagamentos — dados de cartão tratados sob padrão PCI-DSS.</li>
        <li><strong>AWS (Amazon Web Services):</strong> infraestrutura de armazenamento com criptografia.</li>
        <li><strong>Resend:</strong> serviço de envio de e-mails transacionais.</li>
        <li><strong>Autoridades legais:</strong> quando exigido por lei, ordem judicial ou regulação aplicável.</li>
      </ul>
      <p class="mt-3">Não vendemos dados pessoais a terceiros para fins comerciais ou publicitários.</p>`,
      en: `<p>Your personal data may be shared with:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Healthcare professionals:</strong> to provide the care requested by the patient.</li>
        <li><strong>Stripe:</strong> payment processor — card data handled under PCI-DSS standard.</li>
        <li><strong>AWS (Amazon Web Services):</strong> encrypted storage infrastructure.</li>
        <li><strong>Resend:</strong> transactional email delivery service.</li>
        <li><strong>Legal authorities:</strong> when required by law, court order, or applicable regulation.</li>
      </ul>
      <p class="mt-3">We do not sell personal data to third parties for commercial or advertising purposes.</p>`,
      es: `<p>Sus datos personales pueden ser compartidos con:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Profesionales de la salud:</strong> para prestar el servicio solicitado por el paciente.</li>
        <li><strong>Stripe:</strong> procesador de pagos — datos de tarjeta tratados bajo estándar PCI-DSS.</li>
        <li><strong>AWS (Amazon Web Services):</strong> infraestructura de almacenamiento con cifrado.</li>
        <li><strong>Resend:</strong> servicio de envío de correos electrónicos transaccionales.</li>
        <li><strong>Autoridades legales:</strong> cuando lo exija la ley, una orden judicial o la regulación aplicable.</li>
      </ul>
      <p class="mt-3">No vendemos datos personales a terceros con fines comerciales o publicitarios.</p>`,
    },
  },
  {
    title: {
      pt: "6. Transferências Internacionais (GDPR)",
      en: "6. International Transfers (GDPR)",
      es: "6. Transferencias Internacionales (GDPR)",
    },
    content: {
      pt: `<p>A Doctor8 atua no Brasil, nos Estados Unidos e na Europa. Para usuários na União Europeia, as transferências internacionais de dados pessoais para fora do Espaço Econômico Europeu (EEE) são realizadas com base em:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Cláusulas Contratuais Padrão aprovadas pela Comissão Europeia;</li>
        <li>Necessidade contratual para prestação dos serviços solicitados;</li>
        <li>Consentimento explícito do titular.</li>
      </ul>
      <p class="mt-3">Nossos servidores AWS estão localizados em regiões com adequado nível de proteção. Todos os dados são criptografados em trânsito (TLS 1.2+) e em repouso (AES-256).</p>`,
      en: `<p>Doctor8 operates in Brazil, the United States, and Europe. For users in the European Union, international transfers of personal data outside the European Economic Area (EEA) are carried out on the basis of:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Standard Contractual Clauses approved by the European Commission;</li>
        <li>Contractual necessity for the provision of requested services;</li>
        <li>Explicit consent of the data subject.</li>
      </ul>
      <p class="mt-3">Our AWS servers are located in regions with an adequate level of protection. All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</p>`,
      es: `<p>Doctor8 opera en Brasil, Estados Unidos y Europa. Para usuarios en la Unión Europea, las transferencias internacionales de datos personales fuera del Espacio Económico Europeo (EEE) se realizan con base en:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Cláusulas Contractuales Tipo aprobadas por la Comisión Europea;</li>
        <li>Necesidad contractual para la prestación de los servicios solicitados;</li>
        <li>Consentimiento explícito del titular.</li>
      </ul>
      <p class="mt-3">Nuestros servidores AWS están ubicados en regiones con un nivel adecuado de protección. Todos los datos están cifrados en tránsito (TLS 1.2+) y en reposo (AES-256).</p>`,
    },
  },
  {
    title: {
      pt: "7. Segurança e Retenção de Dados",
      en: "7. Security and Data Retention",
      es: "7. Seguridad y Retención de Datos",
    },
    content: {
      pt: `<p>Adotamos as seguintes medidas de segurança:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Criptografia de dados sensíveis de saúde (AES-256);</li>
        <li>Transmissão via TLS 1.2+;</li>
        <li>Autenticação com senhas hasheadas (bcrypt);</li>
        <li>Logs de auditoria para acesso a prontuários;</li>
        <li>Conformidade com HIPAA (EUA) e LGPD (Brasil).</li>
      </ul>
      <p class="mt-3"><strong>Retenção:</strong> Dados pessoais são mantidos pelo tempo necessário para a prestação dos serviços e cumprimento de obrigações legais. Dados de saúde seguem os prazos mínimos definidos pelo CFM e legislação aplicável. Você pode solicitar a exclusão dos seus dados a qualquer momento.</p>`,
      en: `<p>We adopt the following security measures:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Encryption of sensitive health data (AES-256);</li>
        <li>Transmission via TLS 1.2+;</li>
        <li>Authentication with hashed passwords (bcrypt);</li>
        <li>Audit logs for health record access;</li>
        <li>HIPAA (US) and LGPD (Brazil) compliance.</li>
      </ul>
      <p class="mt-3"><strong>Retention:</strong> Personal data is kept for as long as necessary to provide services and meet legal obligations. Health data follows the minimum periods defined by CFM and applicable legislation. You may request deletion of your data at any time.</p>`,
      es: `<p>Adoptamos las siguientes medidas de seguridad:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Cifrado de datos sensibles de salud (AES-256);</li>
        <li>Transmisión mediante TLS 1.2+;</li>
        <li>Autenticación con contraseñas hasheadas (bcrypt);</li>
        <li>Registros de auditoría para acceso a historiales clínicos;</li>
        <li>Cumplimiento con HIPAA (EE.UU.) y LGPD (Brasil).</li>
      </ul>
      <p class="mt-3"><strong>Retención:</strong> Los datos personales se conservan durante el tiempo necesario para prestar los servicios y cumplir las obligaciones legales. Los datos de salud siguen los plazos mínimos definidos por el CFM y la legislación aplicable. Puede solicitar la eliminación de sus datos en cualquier momento.</p>`,
    },
  },
  {
    title: {
      pt: "8. Contato e DPO",
      en: "8. Contact and DPO",
      es: "8. Contacto y DPO",
    },
    content: {
      pt: `<p>Para exercer seus direitos ou esclarecer dúvidas sobre esta Política:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 E-mail: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>📍 Endereço: Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, CEP 30.320-595, Brasil</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">Versões: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (10/04/2023) · DOC 004 (2026)</p>`,
      en: `<p>To exercise your rights or clarify questions about this Policy:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 Email: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>📍 Address: Rua Jornalista Djalma Andrade, nº 1505, Room 01, Belvedere, Belo Horizonte/MG, ZIP 30.320-595, Brazil</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">Versions: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (10/04/2023) · DOC 004 (2026)</p>`,
      es: `<p>Para ejercer sus derechos o aclarar dudas sobre esta Política:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 Correo electrónico: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>📍 Dirección: Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, CEP 30.320-595, Brasil</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">Versiones: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (10/04/2023) · DOC 004 (2026)</p>`,
    },
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title={{ pt: "Política de Privacidade", en: "Privacy Policy", es: "Política de Privacidad" }}
      subtitle={{
        pt: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · Conforme LGPD e GDPR",
        en: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · LGPD and GDPR Compliant",
        es: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · Conforme con LGPD y GDPR",
      }}
      lastUpdated="Janeiro de 2026"
      badge="LGPD + GDPR"
      badgeColor="#176a88"
      sections={sections}
    />
  );
}
