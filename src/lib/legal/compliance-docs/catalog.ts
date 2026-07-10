import type { ComplianceDoc } from "./types";
import { publishedComplianceDocs } from "./published";
import { lgpdCoreDocs } from "./content/lgpd-core";
import { contractsAndClinicalDocs } from "./content/contracts-clinical";
import { organizationalDocs } from "./content/organizational";
import { cultureDocs } from "./content/culture";

export const allComplianceDocs: ComplianceDoc[] = [
  ...cultureDocs,
  ...publishedComplianceDocs,
  ...lgpdCoreDocs,
  ...contractsAndClinicalDocs,
  ...organizationalDocs,
];

export function getComplianceDoc(slug: string): ComplianceDoc | undefined {
  return allComplianceDocs.find((doc) => doc.slug === slug);
}

export function getComplianceDocSlugs(): string[] {
  return allComplianceDocs.map((doc) => doc.slug);
}

export const complianceStatusLabels = {
  published: "Em vigor",
  partial: "Parcial",
  draft: "Novo — revisar",
} as const;

export const complianceStatusColors = {
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
} as const;
