// src/app/terms/page.tsx
// Termos de Uso — baseado no documento oficial da INFO8
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Termos de Uso | Terms of Use | Doctor8",
  description: "Termos de Uso e Acordo do Usuário do DOCTOR8.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: { pt: "1. Aceitação dos Termos", en: "1. Acceptance of Terms", es: "1. Aceptación de los Términos" },
    content: {
      pt: `<p>Ao clicar em "Cadastrar" ou utilizar qualquer funcionalidade do <strong>DOCTOR8</strong>, disponível em <strong>doctor8.com.br</strong> e <strong>doctor8.org</strong>, você declara ter lido, entendido e concordado integralmente com estes Termos de Uso e com a <a href="/privacy" class="text-blue-600 underline">Política de Privacidade</a>.</p>
      <p class="mt-2">Estes Termos constituem um contrato vinculante entre você e a <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA</strong> (CNPJ 20.251.527/0001-04).</p>`,
      en: `<p>By clicking "Register" or using any feature of <strong>DOCTOR8</strong>, available at <strong>doctor8.com.br</strong> and <strong>doctor8.org</strong>, you declare that you have read, understood, and fully agreed to these Terms of Use and the <a href="/privacy" class="text-blue-600 underline">Privacy Policy</a>.</p>
      <p class="mt-2">These Terms constitute a binding contract between you and <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA</strong> (CNPJ 20.251.527/0001-04).</p>`,
      es: `<p>Al hacer clic en "Registrarse" o utilizar cualquier funcionalidad de <strong>DOCTOR8</strong>, disponible en <strong>doctor8.com.br</strong> y <strong>doctor8.org</strong>, declara haber leído, entendido y aceptado íntegramente estos Términos de Uso y la <a href="/privacy" class="text-blue-600 underline">Política de Privacidad</a>.</p>
      <p class="mt-2">Estos Términos constituyen un contrato vinculante entre usted e <strong>INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA</strong> (CNPJ 20.251.527/0001-04).</p>`,
    },
  },
  {
    title: { pt: "2. Quem Pode Utilizar", en: "2. Who May Use", es: "2. Quién Puede Utilizar" },
    content: {
      pt: `<p>O DOCTOR8 pode ser utilizado por:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Usuário Paciente:</strong> pessoa que busca serviços de saúde e armazenamento de prontuário.</li>
        <li><strong>Usuário Profissional de Saúde:</strong> profissional registrado no conselho competente que presta serviços via plataforma.</li>
      </ul>
      <p class="mt-3">É obrigatório ter <strong>18 anos ou mais</strong>. Menores de 18 anos devem ter autorização expressa do responsável legal, indicando nome e telefone do responsável no cadastro.</p>
      <p class="mt-2">Profissionais de saúde devem estar com registro ativo no conselho regional/federal de sua especialidade.</p>`,
      en: `<p>DOCTOR8 may be used by:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Patient User:</strong> person seeking health services and health record storage.</li>
        <li><strong>Healthcare Professional User:</strong> professional registered with the competent council providing services via the platform.</li>
      </ul>
      <p class="mt-3">You must be <strong>18 years or older</strong>. Minors under 18 must have express authorization from their legal guardian, with the guardian's name and phone number provided at registration.</p>
      <p class="mt-2">Healthcare professionals must have an active registration with their regional/federal professional council.</p>`,
      es: `<p>DOCTOR8 puede ser utilizado por:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Usuario Paciente:</strong> persona que busca servicios de salud y almacenamiento de historia clínica.</li>
        <li><strong>Usuario Profesional de Salud:</strong> profesional registrado en el consejo competente que presta servicios a través de la plataforma.</li>
      </ul>
      <p class="mt-3">Es obligatorio tener <strong>18 años o más</strong>. Los menores de 18 años deben contar con la autorización expresa de su representante legal, indicando nombre y teléfono del responsable en el registro.</p>
      <p class="mt-2">Los profesionales de la salud deben tener su registro activo en el consejo regional/federal de su especialidad.</p>`,
    },
  },
  {
    title: { pt: "3. Uso da Plataforma", en: "3. Platform Use", es: "3. Uso de la Plataforma" },
    content: {
      pt: `<p>Ao utilizar o DOCTOR8, você concorda em:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>Fornecer informações verdadeiras e mantê-las atualizadas;</li>
        <li>Manter a confidencialidade de sua senha de acesso;</li>
        <li>Não utilizar dados de terceiros ou que possam lesar direitos alheios;</li>
        <li>Não gravar consultas ou sessões sem autorização expressa;</li>
        <li>Não realizar engenharia reversa, modificação ou reprodução do software;</li>
        <li>Não usar o DOCTOR8 para fins ilegais, fraudulentos ou que violem direitos de terceiros;</li>
        <li>Respeitar as normas dos Conselhos Regionais e Federais de sua especialidade (para profissionais).</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">O DOCTOR8 não substitui atendimento de emergência. Em caso de emergência médica, ligue imediatamente para os serviços de emergência do seu país (SAMU 192 no Brasil, 911 nos EUA, 112 na Europa).</p>`,
      en: `<p>By using DOCTOR8, you agree to:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>Provide accurate information and keep it up to date;</li>
        <li>Maintain the confidentiality of your access password;</li>
        <li>Not use third-party data or data that could harm others' rights;</li>
        <li>Not record consultations or sessions without express authorization;</li>
        <li>Not reverse engineer, modify, or reproduce the software;</li>
        <li>Not use DOCTOR8 for illegal, fraudulent purposes or that violate third-party rights;</li>
        <li>Comply with the rules of your professional council (for professionals).</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">DOCTOR8 does not replace emergency care. In case of a medical emergency, immediately call your country's emergency services (SAMU 192 in Brazil, 911 in the US, 112 in Europe).</p>`,
      es: `<p>Al utilizar DOCTOR8, usted acepta:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li>Proporcionar información veraz y mantenerla actualizada;</li>
        <li>Mantener la confidencialidad de su contraseña de acceso;</li>
        <li>No utilizar datos de terceros ni que puedan lesionar derechos ajenos;</li>
        <li>No grabar consultas o sesiones sin autorización expresa;</li>
        <li>No realizar ingeniería inversa, modificación o reproducción del software;</li>
        <li>No usar DOCTOR8 para fines ilegales, fraudulentos o que violen derechos de terceros;</li>
        <li>Respetar las normas de los Consejos Regionales y Federales de su especialidad (para profesionales).</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">DOCTOR8 no reemplaza la atención de emergencia. En caso de emergencia médica, llame inmediatamente a los servicios de emergencia de su país (SAMU 192 en Brasil, 911 en EE.UU., 112 en Europa).</p>`,
    },
  },
  {
    title: { pt: "4. Responsabilidades e Limitações", en: "4. Responsibilities and Limitations", es: "4. Responsabilidades y Limitaciones" },
    content: {
      pt: `<p>A <strong>INFO8</strong> é responsável por:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>Manter a plataforma disponível e segura;</li>
        <li>Proteger os dados pessoais conforme esta Política e a LGPD/GDPR;</li>
        <li>Intermediar o agendamento entre paciente e profissional.</li>
      </ul>
      <p class="mt-3">A <strong>INFO8 não é responsável</strong> por:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>O conteúdo das consultas, diagnósticos ou prescrições realizadas pelos profissionais;</li>
        <li>Informações incorretas fornecidas pelos usuários;</li>
        <li>Resultados das consultas intermediadas;</li>
        <li>Falhas decorrentes de problemas de internet ou dispositivo do usuário.</li>
      </ul>
      <p class="mt-3">O <strong>Club Doctor não é plano de saúde</strong> nem serviço de emergência médica. As consultas são cobradas separadamente da assinatura.</p>`,
      en: `<p><strong>INFO8</strong> is responsible for:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>Maintaining the platform available and secure;</li>
        <li>Protecting personal data as per this Policy and LGPD/GDPR;</li>
        <li>Intermediating scheduling between patient and professional.</li>
      </ul>
      <p class="mt-3"><strong>INFO8 is not responsible</strong> for:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>The content of consultations, diagnoses, or prescriptions made by professionals;</li>
        <li>Incorrect information provided by users;</li>
        <li>Outcomes of intermediated consultations;</li>
        <li>Failures due to the user's internet or device issues.</li>
      </ul>
      <p class="mt-3"><strong>Club Doctor is not a health insurance plan</strong> or emergency medical service. Consultations are billed separately from the subscription.</p>`,
      es: `<p><strong>INFO8</strong> es responsable de:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>Mantener la plataforma disponible y segura;</li>
        <li>Proteger los datos personales conforme a esta Política y la LGPD/GDPR;</li>
        <li>Intermediar la programación entre paciente y profesional.</li>
      </ul>
      <p class="mt-3"><strong>INFO8 no es responsable</strong> de:</p>
      <ul class="list-disc pl-5 space-y-1 mt-1">
        <li>El contenido de las consultas, diagnósticos o prescripciones realizadas por los profesionales;</li>
        <li>Información incorrecta proporcionada por los usuarios;</li>
        <li>Resultados de las consultas intermediadas;</li>
        <li>Fallas debidas a problemas de internet o dispositivo del usuario.</li>
      </ul>
      <p class="mt-3"><strong>Club Doctor no es un seguro médico</strong> ni un servicio de emergencia. Las consultas se cobran por separado de la suscripción.</p>`,
    },
  },
  {
    title: { pt: "5. Pagamentos e Cancelamento", en: "5. Payments and Cancellation", es: "5. Pagos y Cancelación" },
    content: {
      pt: `<p>Os pagamentos são processados de forma segura pelo <strong>Stripe</strong> (PCI-DSS Level 1). São aceitos cartão de crédito, Pix e PayPal.</p>
      <p class="mt-2">Reembolsos são concedidos apenas quando os serviços não foram prestados. A INFO8 pode ajustar preços a qualquer momento, com aviso prévio aos usuários.</p>
      <p class="mt-2">O <strong>Club Doctor</strong> pode ser cancelado a qualquer momento, sem multa, com efeito no próximo ciclo de cobrança.</p>`,
      en: `<p>Payments are processed securely by <strong>Stripe</strong> (PCI-DSS Level 1). Credit card, Pix, and PayPal are accepted.</p>
      <p class="mt-2">Refunds are granted only when services were not provided. INFO8 may adjust prices at any time with prior notice to users.</p>
      <p class="mt-2"><strong>Club Doctor</strong> can be canceled at any time, without penalty, effective from the next billing cycle.</p>`,
      es: `<p>Los pagos son procesados de forma segura por <strong>Stripe</strong> (PCI-DSS Nivel 1). Se aceptan tarjeta de crédito, Pix y PayPal.</p>
      <p class="mt-2">Los reembolsos se otorgan solo cuando los servicios no fueron prestados. INFO8 puede ajustar los precios en cualquier momento, con previo aviso a los usuarios.</p>
      <p class="mt-2">El <strong>Club Doctor</strong> puede cancelarse en cualquier momento, sin penalidad, con efecto en el siguiente ciclo de facturación.</p>`,
    },
  },
  {
    title: { pt: "6. Propriedade Intelectual", en: "6. Intellectual Property", es: "6. Propiedad Intelectual" },
    content: {
      pt: `<p>Todos os direitos sobre o software DOCTOR8, marca, logotipo, textos, imagens e demais elementos são de propriedade exclusiva da <strong>INFO8</strong>, protegidos pela legislação brasileira de direitos autorais.</p>
      <p class="mt-2">É vedado imitar, copiar, reproduzir ou usar o nome, marca ou qualquer elemento identificador da INFO8 sem autorização prévia e expressa.</p>`,
      en: `<p>All rights to the DOCTOR8 software, brand, logo, texts, images, and other elements are the exclusive property of <strong>INFO8</strong>, protected by Brazilian copyright law.</p>
      <p class="mt-2">It is prohibited to imitate, copy, reproduce, or use INFO8's name, brand, or any identifying element without prior express authorization.</p>`,
      es: `<p>Todos los derechos sobre el software DOCTOR8, marca, logotipo, textos, imágenes y demás elementos son propiedad exclusiva de <strong>INFO8</strong>, protegidos por la legislación brasileña de derechos de autor.</p>
      <p class="mt-2">Está prohibido imitar, copiar, reproducir o usar el nombre, marca o cualquier elemento identificador de INFO8 sin autorización previa y expresa.</p>`,
    },
  },
  {
    title: { pt: "7. Foro e Lei Aplicável", en: "7. Jurisdiction and Applicable Law", es: "7. Jurisdicción y Ley Aplicable" },
    content: {
      pt: `<p>Este instrumento é regido pela legislação brasileira. Fica eleito o foro da <strong>Comarca de Belo Horizonte, Minas Gerais, Brasil</strong>, com renúncia a qualquer outro.</p>
      <p class="mt-2">Para usuários na União Europeia, aplicam-se adicionalmente o GDPR e as leis de proteção ao consumidor da UE.</p>
      <p class="mt-3">Dúvidas: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>
      <p class="mt-2 text-xs text-slate-500">Versões: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (16/04/2023) · DOC 004 (2026)</p>`,
      en: `<p>This instrument is governed by Brazilian law. The courts of <strong>Belo Horizonte, Minas Gerais, Brazil</strong> have exclusive jurisdiction.</p>
      <p class="mt-2">For users in the European Union, the GDPR and EU consumer protection laws additionally apply.</p>
      <p class="mt-3">Questions: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>
      <p class="mt-2 text-xs text-slate-500">Versions: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (16/04/2023) · DOC 004 (2026)</p>`,
      es: `<p>Este instrumento se rige por la legislación brasileña. Se elige el fuero de <strong>Belo Horizonte, Minas Gerais, Brasil</strong>, con renuncia a cualquier otro.</p>
      <p class="mt-2">Para usuarios en la Unión Europea, se aplican adicionalmente el GDPR y las leyes de protección al consumidor de la UE.</p>
      <p class="mt-3">Dudas: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>
      <p class="mt-2 text-xs text-slate-500">Versiones: DOC 001 (08/03/2021) · DOC 002 (26/02/2022) · DOC 003 (16/04/2023) · DOC 004 (2026)</p>`,
    },
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title={{ pt: "Termos de Uso e Acordo do Usuário", en: "Terms of Use and User Agreement", es: "Términos de Uso y Acuerdo del Usuario" }}
      subtitle={{
        pt: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
        en: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
        es: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
      }}
      lastUpdated="Janeiro de 2026"
      badge="Termos Legais"
      badgeColor="#e05930"
      sections={sections}
    />
  );
}
