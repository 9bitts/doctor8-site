// Typed accessors for PatientProfessionalLink / ProfessionalEmissionReport.
// Schema requires `prisma db push` + `prisma generate` after deploy.

import { db } from "@/lib/db";

export type LinkStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED";

export interface PatientProfessionalLinkRow {
  id: string;
  patientUserId: string;
  professionalUserId: string;
  status: LinkStatus;
  requestedBy: string;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface ProfessionalEmissionReportRow {
  id: string;
  patientUserId: string;
  professionalUserId: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
}

type LinkDb = {
  findFirst: (args: object) => Promise<PatientProfessionalLinkRow | null>;
  findMany: (args: object) => Promise<PatientProfessionalLinkRow[]>;
  findUnique: (args: object) => Promise<PatientProfessionalLinkRow | null>;
  create: (args: object) => Promise<PatientProfessionalLinkRow>;
  update: (args: object) => Promise<PatientProfessionalLinkRow>;
  upsert: (args: object) => Promise<PatientProfessionalLinkRow>;
  count: (args: object) => Promise<number>;
};

type EmissionReportDb = {
  create: (args: object) => Promise<ProfessionalEmissionReportRow>;
  count: (args: object) => Promise<number>;
  findFirst: (args: object) => Promise<ProfessionalEmissionReportRow | null>;
};

export function linkDb(): LinkDb {
  return (db as unknown as { patientProfessionalLink: LinkDb }).patientProfessionalLink;
}

export function emissionReportDb(): EmissionReportDb {
  return (db as unknown as { professionalEmissionReport: EmissionReportDb }).professionalEmissionReport;
}
