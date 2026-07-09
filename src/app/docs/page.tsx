import DocsHubClient from "@/components/compliance/DocsHubClient";

export const metadata = {
  title: "Documentação LGPD e Telemedicina | Doctor8",
  description:
    "Portal de conformidade da Doctor8: políticas, termos, ROPA, DPIA, telemedicina CFM e demais documentos LGPD.",
  robots: { index: true, follow: true },
};

export default function DocsPage() {
  return <DocsHubClient />;
}
