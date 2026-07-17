import type { AcuraVolunteerStatus } from "@prisma/client";
import type { AcuraVolunteerKind } from "@/lib/acura-volunteer";
import type { AdminProfessionCategory } from "@/lib/admin-provider-categories";

export type AcuraVolunteerAdminRow = {
  id: string;
  userId: string;
  kind: AcuraVolunteerKind;
  category: AdminProfessionCategory;
  name: string;
  email: string | null;
  specialty: string | null;
  verified: boolean;
  emailVerified: boolean;
  licenseDocCount: number;
  status: AcuraVolunteerStatus;
  acuraVolunteer: boolean;
  approvedAt: string | null;
  createdAt: string;
};

export type AcuraCategoryCounts = Record<AdminProfessionCategory, number>;

export type AcuraVolunteerAdminList = {
  totals: {
    pending: number;
    active: number;
    activeVerified: number;
    revoked: number;
    byCategory: AcuraCategoryCounts;
  };
  rows: AcuraVolunteerAdminRow[];
};

export const ACURA_CATEGORY_ORDER: AdminProfessionCategory[] = [
  "medicos",
  "psicologos",
  "psicanalistas",
  "terapeutas",
  "nutricionistas",
  "fisioterapeutas",
  "enfermeiros",
  "farmaceuticos",
  "odontologistas",
];
