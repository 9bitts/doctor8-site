// src/app/hipaa/page.tsx
// HIPAA Notice of Privacy Practices
// Required for US-facing healthcare platforms
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "HIPAA Notice of Privacy Practices | Doctor8",
  description: "HIPAA Notice of Privacy Practices — Doctor8 healthcare platform.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: {
      pt: "Aviso de Práticas de Privacidade (HIPAA)",
      en: "Notice of Privacy Practices (HIPAA)",
      es: "Aviso de Prácticas de Privacidad (HIPAA)",
    },
    content: {
      pt: `<p>Este Aviso descreve como informações médicas sobre você podem ser usadas e divulgadas e como você pode obter acesso a essas informações. <strong>Por favor, leia atentamente.</strong></p>
      <p class="mt-2">A Doctor8 (operada pela INFO8 Desenvolvimento de Sistemas e Site Ltda) está comprometida em proteger a privacidade de suas Informações de Saúde Protegidas (PHI) conforme exigido pelo <strong>Health Insurance Portability and Accountability Act of 1996 (HIPAA)</strong> dos Estados Unidos.</p>`,
      en: `<p>This Notice describes how medical information about you may be used and disclosed and how you can get access to this information. <strong>Please review it carefully.</strong></p>
      <p class="mt-2">Doctor8 (operated by INFO8 Desenvolvimento de Sistemas e Site Ltda) is committed to protecting the privacy of your Protected Health Information (PHI) as required by the <strong>Health Insurance Portability and Accountability Act of 1996 (HIPAA)</strong>.</p>`,
      es: `<p>Este Aviso describe cómo la información médica sobre usted puede ser utilizada y divulgada y cómo puede acceder a dicha información. <strong>Por favor, léalo atentamente.</strong></p>
      <p class="mt-2">Doctor8 (operada por INFO8 Desenvolvimento de Sistemas e Site Ltda) está comprometida con la protección de su Información de Salud Protegida (PHI) según lo requerido por el <strong>Health Insurance Portability and Accountability Act of 1996 (HIPAA)</strong> de los Estados Unidos.</p>`,
    },
  },
  {
    title: {
      pt: "Como Usamos Suas Informações de Saúde Protegidas (PHI)",
      en: "How We Use Your Protected Health Information (PHI)",
      es: "Cómo Usamos Su Información de Salud Protegida (PHI)",
    },
    content: {
      pt: `<p>Podemos usar e divulgar suas PHI para os seguintes fins:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Tratamento:</strong> Compartilhamos suas PHI com profissionais de saúde envolvidos em seu atendimento para coordenar seu tratamento.</li>
        <li><strong>Operações:</strong> Usamos suas PHI para gerenciar e melhorar nossos serviços de saúde, incluindo garantia de qualidade e atividades administrativas.</li>
        <li><strong>Pagamento:</strong> Processamos informações necessárias para pagamento de serviços de saúde, incluindo verificação de cobertura e processamento de cobranças.</li>
        <li><strong>Exigências legais:</strong> Divulgamos PHI quando exigido por lei federal ou estadual, inclusive para autoridades de saúde pública.</li>
        <li><strong>Segurança:</strong> Podemos divulgar PHI para prevenir uma ameaça grave à saúde ou segurança pública.</li>
      </ul>`,
      en: `<p>We may use and disclose your PHI for the following purposes:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Treatment:</strong> We share your PHI with healthcare professionals involved in your care to coordinate your treatment.</li>
        <li><strong>Operations:</strong> We use your PHI to manage and improve our health services, including quality assurance and administrative activities.</li>
        <li><strong>Payment:</strong> We process information necessary for payment of health services, including coverage verification and billing processing.</li>
        <li><strong>Legal requirements:</strong> We disclose PHI when required by federal or state law, including to public health authorities.</li>
        <li><strong>Safety:</strong> We may disclose PHI to prevent a serious threat to public health or safety.</li>
      </ul>`,
      es: `<p>Podemos usar y divulgar su PHI para los siguientes fines:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Tratamiento:</strong> Compartimos su PHI con profesionales de la salud involucrados en su atención para coordinar su tratamiento.</li>
        <li><strong>Operaciones:</strong> Usamos su PHI para gestionar y mejorar nuestros servicios de salud, incluyendo garantía de calidad y actividades administrativas.</li>
        <li><strong>Pago:</strong> Procesamos información necesaria para el pago de servicios de salud, incluyendo verificación de cobertura y procesamiento de facturación.</li>
        <li><strong>Requisitos legales:</strong> Divulgamos PHI cuando lo exige la ley federal o estatal, incluso a autoridades de salud pública.</li>
        <li><strong>Seguridad:</strong> Podemos divulgar PHI para prevenir una amenaza grave a la salud o seguridad pública.</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "Seus Direitos sob o HIPAA",
      en: "Your Rights Under HIPAA",
      es: "Sus Derechos bajo el HIPAA",
    },
    content: {
      pt: `<p>Você tem os seguintes direitos em relação às suas PHI:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Acesso:</strong> Solicitar acesso e cópia das suas PHI mantidas em nosso sistema.</li>
        <li><strong>Emenda:</strong> Solicitar correção de PHI incompletas ou incorretas.</li>
        <li><strong>Restrição:</strong> Solicitar restrição de certas divulgações das suas PHI.</li>
        <li><strong>Comunicação confidencial:</strong> Solicitar que nos comuniquemos com você de forma alternativa ou em local alternativo.</li>
        <li><strong>Histórico de divulgações:</strong> Solicitar uma lista de divulgações das suas PHI feitas nos últimos 6 anos.</li>
        <li><strong>Cópia desta Política:</strong> Solicitar uma cópia em papel deste Aviso a qualquer momento.</li>
        <li><strong>Reclamação:</strong> Registrar uma reclamação no Escritório de Direitos Civis do HHS (Office for Civil Rights, U.S. Dept. of Health &amp; Human Services).</li>
      </ul>`,
      en: `<p>You have the following rights regarding your PHI:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Access:</strong> Request access and a copy of your PHI maintained in our system.</li>
        <li><strong>Amendment:</strong> Request correction of incomplete or incorrect PHI.</li>
        <li><strong>Restriction:</strong> Request restriction of certain disclosures of your PHI.</li>
        <li><strong>Confidential communication:</strong> Request that we communicate with you in an alternative way or at an alternative location.</li>
        <li><strong>Disclosure accounting:</strong> Request a list of disclosures of your PHI made in the past 6 years.</li>
        <li><strong>Copy of this Notice:</strong> Request a paper copy of this Notice at any time.</li>
        <li><strong>Complaint:</strong> File a complaint with the HHS Office for Civil Rights (U.S. Dept. of Health &amp; Human Services).</li>
      </ul>`,
      es: `<p>Tiene los siguientes derechos con respecto a su PHI:</p>
      <ul class="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Acceso:</strong> Solicitar acceso y una copia de su PHI conservada en nuestro sistema.</li>
        <li><strong>Enmienda:</strong> Solicitar corrección de PHI incompleta o incorrecta.</li>
        <li><strong>Restricción:</strong> Solicitar la restricción de ciertas divulgaciones de su PHI.</li>
        <li><strong>Comunicación confidencial:</strong> Solicitar que nos comuniquemos con usted de manera alternativa o en un lugar alternativo.</li>
        <li><strong>Historial de divulgaciones:</strong> Solicitar una lista de divulgaciones de su PHI realizadas en los últimos 6 años.</li>
        <li><strong>Copia de este Aviso:</strong> Solicitar una copia en papel de este Aviso en cualquier momento.</li>
        <li><strong>Reclamación:</strong> Presentar una queja ante la Oficina de Derechos Civiles del HHS (EE.UU.).</li>
      </ul>`,
    },
  },
  {
    title: {
      pt: "Medidas de Segurança Técnica",
      en: "Technical Security Measures",
      es: "Medidas de Seguridad Técnica",
    },
    content: {
      pt: `<p>Para proteger suas PHI, implementamos as seguintes salvaguardas exigidas pelo HIPAA Security Rule:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Criptografia de dados em repouso: AES-256;</li>
        <li>Criptografia em trânsito: TLS 1.2+;</li>
        <li>Controle de acesso baseado em papéis (RBAC);</li>
        <li>Logs de auditoria para todo acesso a PHI;</li>
        <li>Autenticação segura com hash de senhas (bcrypt);</li>
        <li>Sessões com expiração automática;</li>
        <li>Backups criptografados em infraestrutura AWS.</li>
      </ul>`,
      en: `<p>To protect your PHI, we have implemented the following safeguards required by the HIPAA Security Rule:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Data at rest encryption: AES-256;</li>
        <li>Data in transit encryption: TLS 1.2+;</li>
        <li>Role-based access control (RBAC);</li>
        <li>Audit logs for all PHI access;</li>
        <li>Secure authentication with password hashing (bcrypt);</li>
        <li>Sessions with automatic expiration;</li>
        <li>Encrypted backups on AWS infrastructure.</li>
      </ul>`,
      es: `<p>Para proteger su PHI, hemos implementado las siguientes salvaguardas requeridas por la Regla de Seguridad HIPAA:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Cifrado de datos en reposo: AES-256;</li>
        <li>Cifrado en tránsito: TLS 1.2+;</li>
        <li>Control de acceso basado en roles (RBAC);</li>
        <li>Registros de auditoría para todo acceso a PHI;</li>
        <li>Autenticación segura con hash de contraseñas (bcrypt);</li>
        <li>Sesiones con expiración automática;</li>
        <li>Copias de seguridad cifradas en infraestructura AWS.</li>
      </ul>`,
    },
  },
  {
    title: { pt: "Contato e Reclamações", en: "Contact and Complaints", es: "Contacto y Reclamaciones" },
    content: {
      pt: `<p>Para exercer seus direitos HIPAA ou registrar uma reclamação:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>🌐 doctor8.org</li>
      </ul>
      <p class="mt-3">Para reclamações ao governo dos EUA:</p>
      <ul class="list-none mt-1">
        <li>🇺🇸 HHS Office for Civil Rights: <a href="https://www.hhs.gov/ocr" class="text-blue-600 underline" target="_blank" rel="noopener">www.hhs.gov/ocr</a></li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">Não tomaremos retaliação contra você por registrar uma reclamação.</p>`,
      en: `<p>To exercise your HIPAA rights or file a complaint:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>🌐 doctor8.org</li>
      </ul>
      <p class="mt-3">To file a complaint with the US government:</p>
      <ul class="list-none mt-1">
        <li>🇺🇸 HHS Office for Civil Rights: <a href="https://www.hhs.gov/ocr" class="text-blue-600 underline" target="_blank" rel="noopener">www.hhs.gov/ocr</a></li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">We will not retaliate against you for filing a complaint.</p>`,
      es: `<p>Para ejercer sus derechos HIPAA o presentar una queja:</p>
      <ul class="list-none mt-2 space-y-1">
        <li>📧 <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></li>
        <li>🌐 doctor8.org</li>
      </ul>
      <p class="mt-3">Para presentar una queja ante el gobierno de EE.UU.:</p>
      <ul class="list-none mt-1">
        <li>🇺🇸 HHS Office for Civil Rights: <a href="https://www.hhs.gov/ocr" class="text-blue-600 underline" target="_blank" rel="noopener">www.hhs.gov/ocr</a></li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">No tomaremos represalias contra usted por presentar una queja.</p>`,
    },
  },
];

export default function HipaaPage() {
  return (
    <LegalLayout
      title={{ pt: "Aviso de Práticas de Privacidade HIPAA", en: "HIPAA Notice of Privacy Practices", es: "Aviso de Prácticas de Privacidad HIPAA" }}
      subtitle={{
        pt: "Doctor8 · Conformidade com o Health Insurance Portability and Accountability Act (EUA)",
        en: "Doctor8 · Health Insurance Portability and Accountability Act Compliance",
        es: "Doctor8 · Cumplimiento con el Health Insurance Portability and Accountability Act (EE.UU.)",
      }}
      lastUpdated="Janeiro de 2026"
      badge="HIPAA"
      badgeColor="#059669"
      sections={sections}
    />
  );
}
