export type ComplianceDocStatus = "published" | "partial" | "draft";

export type ComplianceDocSection = {
  title: string;
  content: string;
};

export type ComplianceDoc = {
  slug: string;
  title: string;
  description: string;
  legalBasis: string;
  required: boolean;
  status: ComplianceDocStatus;
  lastUpdated: string;
  canonicalPath?: string;
  sections: ComplianceDocSection[];
};

export type ComplianceNextStep = {
  priority: number;
  title: string;
  description: string;
  owner: string;
  deadline?: string;
};
