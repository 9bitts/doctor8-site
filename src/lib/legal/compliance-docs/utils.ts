import type { ComplianceDocSection } from "./types";

type TriSection = {
  title: { pt: string };
  content: { pt: string };
};

export function sectionsFromTri(sections: TriSection[]): ComplianceDocSection[] {
  return sections.map((section) => ({
    title: section.title.pt,
    content: section.content.pt,
  }));
}

export const COMPANY_BLOCK = `
<p><strong>Controlador:</strong> INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA (INFO8)<br/>
<strong>CNPJ:</strong> 20.251.527/0001-04<br/>
<strong>Endereço:</strong> Rua Jornalista Djalma Andrade, nº 1505, Sala 01, Belvedere, Belo Horizonte/MG, CEP 30.320-595<br/>
<strong>Plataforma:</strong> Doctor8 (app.doctor8.org / doctor8.com.br)</p>
`;
