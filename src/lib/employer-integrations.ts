/** Status das integrações B2B — prontas para plugar terceiros depois da contratação. */

export type IntegrationMode = "live" | "demo" | "disabled";

export type EmployerIntegrationRow = {
  id: string;
  label: string;
  description: string;
  mode: IntegrationMode;
  configured: boolean;
  envKeys: string[];
  demoAvailable: boolean;
  docsPath?: string;
};

function hasEnv(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

export function getEmployerIntegrationStatus(): EmployerIntegrationRow[] {
  const lacunaOk = hasEnv("LACUNA_API_KEY");
  const esocialPartnerOk = hasEnv("ESOCIAL_PARTNER_WEBHOOK_URL");
  const stripeMeteredOk = hasEnv("STRIPE_PRICE_EMPLOYER_EAP_METERED_BRL");
  const stripeBaseOk = hasEnv("STRIPE_SECRET_KEY");

  return [
    {
      id: "icp_brasil",
      label: "Assinatura ICP-Brasil (Lacuna)",
      description: "PAdES em PGR, PCMSO, ASO e critérios GRO.",
      mode: lacunaOk ? "live" : "demo",
      configured: lacunaOk,
      envKeys: ["LACUNA_API_KEY", "LACUNA_ENDPOINT"],
      demoAvailable: true,
      docsPath: "/empresas/documentacao",
    },
    {
      id: "esocial_partner",
      label: "eSocial via parceiro",
      description: "Transmissão S-2220 (ASO) e S-2240 (condições) ao middleware DP.",
      mode: esocialPartnerOk ? "live" : "demo",
      configured: esocialPartnerOk,
      envKeys: ["ESOCIAL_PARTNER_WEBHOOK_URL", "ESOCIAL_PARTNER_API_TOKEN"],
      demoAvailable: true,
      docsPath: "/empresas/exames",
    },
    {
      id: "stripe_metered_eap",
      label: "Cobrança EAP metered (Stripe)",
      description: "Reporta sessões EAP concluídas na fatura corporativa.",
      mode: stripeMeteredOk && stripeBaseOk ? "live" : "demo",
      configured: stripeMeteredOk && stripeBaseOk,
      envKeys: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_EMPLOYER_EAP_METERED_BRL"],
      demoAvailable: true,
      docsPath: "/empresas/configuracoes",
    },
    {
      id: "occupational_clinics",
      label: "Rede de clínicas ocupacionais",
      description: "Agendamento em clínicas parceiras e upload de laudos.",
      mode: "demo",
      configured: false,
      envKeys: ["CLINIC_PARTNER_API_URL"],
      demoAvailable: true,
      docsPath: "/empresas/exames",
    },
    {
      id: "content_audio",
      label: "Conteúdo bem-estar em áudio",
      description: "Trilhas psicoeducativas com player e progresso.",
      mode: "demo",
      configured: true,
      envKeys: [],
      demoAvailable: true,
      docsPath: "/empresas/conteudo",
    },
  ];
}

export function isLacunaConfigured(): boolean {
  return hasEnv("LACUNA_API_KEY");
}

export function isEsocialPartnerConfigured(): boolean {
  return hasEnv("ESOCIAL_PARTNER_WEBHOOK_URL");
}
