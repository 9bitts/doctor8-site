// src/app/cookies/page.tsx
// Política de Cookies — LGPD + GDPR
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Política de Cookies | Cookie Policy | Doctor8",
  description: "Política de Cookies da Doctor8 — alinhada aos princípios LGPD e GDPR.",
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: { pt: "O que são Cookies?", en: "What are Cookies?", es: "¿Qué son las Cookies?" },
    content: {
      pt: `<p>Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você acessa um site. Eles permitem que o site reconheça seu dispositivo, lembre suas preferências e melhore sua experiência.</p>`,
      en: `<p>Cookies are small text files stored on your device when you access a website. They allow the site to recognize your device, remember your preferences, and improve your experience.</p>`,
      es: `<p>Las cookies son pequeños archivos de texto almacenados en su dispositivo cuando accede a un sitio web. Permiten que el sitio reconozca su dispositivo, recuerde sus preferencias y mejore su experiencia.</p>`,
    },
  },
  {
    title: { pt: "Tipos de Cookies que Utilizamos", en: "Types of Cookies We Use", es: "Tipos de Cookies que Utilizamos" },
    content: {
      pt: `<table class="w-full border-collapse text-xs">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Tipo</th><th class="border border-slate-200 p-2 text-left">Finalidade</th><th class="border border-slate-200 p-2 text-left">Duração</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2"><strong>Essenciais</strong></td><td class="border border-slate-200 p-2">Autenticação, segurança, sessão do usuário. Necessários para o funcionamento da plataforma.</td><td class="border border-slate-200 p-2">Sessão / 15 min</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Preferências</strong></td><td class="border border-slate-200 p-2">Idioma selecionado, preferências de interface.</td><td class="border border-slate-200 p-2">1 ano</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Analíticos</strong></td><td class="border border-slate-200 p-2">Análise de uso da plataforma para melhorias. Dados anonimizados.</td><td class="border border-slate-200 p-2">90 dias</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Consentimento (LGPD/GDPR)</strong></td><td class="border border-slate-200 p-2">Registro da sua escolha sobre cookies.</td><td class="border border-slate-200 p-2">1 ano</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">Não utilizamos cookies para fins publicitários de terceiros. Dados de saúde nunca são armazenados em cookies.</p>`,
      en: `<table class="w-full border-collapse text-xs">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Type</th><th class="border border-slate-200 p-2 text-left">Purpose</th><th class="border border-slate-200 p-2 text-left">Duration</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2"><strong>Essential</strong></td><td class="border border-slate-200 p-2">Authentication, security, user session. Required for platform operation.</td><td class="border border-slate-200 p-2">Session / 15 min</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Preferences</strong></td><td class="border border-slate-200 p-2">Selected language, interface preferences.</td><td class="border border-slate-200 p-2">1 year</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Analytics</strong></td><td class="border border-slate-200 p-2">Platform usage analysis for improvements. Anonymized data.</td><td class="border border-slate-200 p-2">90 days</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Consent (LGPD/GDPR)</strong></td><td class="border border-slate-200 p-2">Record of your cookie choice.</td><td class="border border-slate-200 p-2">1 year</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">We do not use cookies for third-party advertising. Health data is never stored in cookies.</p>`,
      es: `<table class="w-full border-collapse text-xs">
        <thead><tr class="bg-slate-100"><th class="border border-slate-200 p-2 text-left">Tipo</th><th class="border border-slate-200 p-2 text-left">Finalidad</th><th class="border border-slate-200 p-2 text-left">Duración</th></tr></thead>
        <tbody>
          <tr><td class="border border-slate-200 p-2"><strong>Esenciales</strong></td><td class="border border-slate-200 p-2">Autenticación, seguridad, sesión del usuario. Necesarios para el funcionamiento de la plataforma.</td><td class="border border-slate-200 p-2">Sesión / 15 min</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Preferencias</strong></td><td class="border border-slate-200 p-2">Idioma seleccionado, preferencias de interfaz.</td><td class="border border-slate-200 p-2">1 año</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Analíticas</strong></td><td class="border border-slate-200 p-2">Análisis del uso de la plataforma para mejoras. Datos anonimizados.</td><td class="border border-slate-200 p-2">90 días</td></tr>
          <tr><td class="border border-slate-200 p-2"><strong>Consentimiento (LGPD/GDPR)</strong></td><td class="border border-slate-200 p-2">Registro de su elección sobre cookies.</td><td class="border border-slate-200 p-2">1 año</td></tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">No utilizamos cookies con fines publicitarios de terceros. Los datos de salud nunca se almacenan en cookies.</p>`,
    },
  },
  {
    title: { pt: "Como Gerenciar Cookies", en: "How to Manage Cookies", es: "Cómo Gestionar las Cookies" },
    content: {
      pt: `<p>Você pode controlar e/ou excluir cookies conforme desejar. Para isso:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Altere as configurações do seu navegador para bloquear ou excluir cookies;</li>
        <li>Use o banner de cookies no site para aceitar ou recusar cookies não essenciais;</li>
        <li>Entre em contato conosco para solicitar a exclusão de dados coletados via cookies.</li>
      </ul>
      <p class="mt-3">Atenção: desabilitar cookies essenciais pode impedir o funcionamento correto da plataforma, incluindo login e sessão.</p>
      <p class="mt-2">Contato: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      en: `<p>You can control and/or delete cookies as you wish. To do so:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Change your browser settings to block or delete cookies;</li>
        <li>Use the cookie banner on the website to accept or decline non-essential cookies;</li>
        <li>Contact us to request deletion of data collected via cookies.</li>
      </ul>
      <p class="mt-3">Note: disabling essential cookies may prevent the platform from working correctly, including login and session.</p>
      <p class="mt-2">Contact: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
      es: `<p>Puede controlar y/o eliminar las cookies como desee. Para ello:</p>
      <ul class="list-disc pl-5 space-y-1 mt-2">
        <li>Cambie la configuración de su navegador para bloquear o eliminar cookies;</li>
        <li>Use el banner de cookies del sitio web para aceptar o rechazar cookies no esenciales;</li>
        <li>Contáctenos para solicitar la eliminación de datos recopilados mediante cookies.</li>
      </ul>
      <p class="mt-3">Atención: deshabilitar las cookies esenciales puede impedir el correcto funcionamiento de la plataforma, incluido el inicio de sesión.</p>
      <p class="mt-2">Contacto: <a href="mailto:concierge@doctor8.com.br" class="text-blue-600 underline">concierge@doctor8.com.br</a></p>`,
    },
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title={{ pt: "Política de Cookies", en: "Cookie Policy", es: "Política de Cookies" }}
      subtitle={{
        pt: "Doctor8 · Princípios LGPD e GDPR",
        en: "Doctor8 · LGPD and GDPR Principles",
        es: "Doctor8 · Principios LGPD y GDPR",
      }}
      lastUpdated="Janeiro de 2026"
      badge="Cookies"
      badgeColor="#6366f1"
      sections={sections}
    />
  );
}
