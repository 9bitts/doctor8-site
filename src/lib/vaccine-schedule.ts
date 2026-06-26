// PNI childhood schedule + status helpers (Phase 8A).

export type VaccineNetwork = "PUBLIC" | "PRIVATE" | "OTHER";

export type VaccineCatalogItem = {
  code: string;
  name: string;
};

export type ScheduleDose = {
  vaccineCode: string;
  vaccineName: string;
  doseNumber: number;
  /** Recommended age in months from birth (0 = at birth). */
  minAgeMonths: number;
};

export type AdministeredVaccine = {
  vaccineCode: string;
  doseNumber: number;
  administeredAt: string;
};

export type ScheduleStatus = "done" | "pending" | "overdue" | "upcoming";

export type ScheduleRow = ScheduleDose & {
  status: ScheduleStatus;
  recommendedDate: string | null;
  administeredAt: string | null;
};

/** Core PNI childhood schedule (simplified, deployable subset). */
export const PNI_SCHEDULE: ScheduleDose[] = [
  { vaccineCode: "BCG", vaccineName: "BCG", doseNumber: 1, minAgeMonths: 0 },
  { vaccineCode: "HEP_B", vaccineName: "Hepatite B", doseNumber: 1, minAgeMonths: 0 },
  { vaccineCode: "HEP_B", vaccineName: "Hepatite B", doseNumber: 2, minAgeMonths: 2 },
  { vaccineCode: "HEP_B", vaccineName: "Hepatite B", doseNumber: 3, minAgeMonths: 6 },
  { vaccineCode: "PENTA", vaccineName: "Pentavalente (DTP + Hib + HepB)", doseNumber: 1, minAgeMonths: 2 },
  { vaccineCode: "PENTA", vaccineName: "Pentavalente (DTP + Hib + HepB)", doseNumber: 2, minAgeMonths: 4 },
  { vaccineCode: "PENTA", vaccineName: "Pentavalente (DTP + Hib + HepB)", doseNumber: 3, minAgeMonths: 6 },
  { vaccineCode: "VIP", vaccineName: "Poliomielite (VIP)", doseNumber: 1, minAgeMonths: 2 },
  { vaccineCode: "VIP", vaccineName: "Poliomielite (VIP)", doseNumber: 2, minAgeMonths: 4 },
  { vaccineCode: "VIP", vaccineName: "Poliomielite (VIP)", doseNumber: 3, minAgeMonths: 6 },
  { vaccineCode: "VIP", vaccineName: "Poliomielite (VIP)", doseNumber: 4, minAgeMonths: 15 },
  { vaccineCode: "PNEUMO_10", vaccineName: "Pneumococica 10-valente", doseNumber: 1, minAgeMonths: 2 },
  { vaccineCode: "PNEUMO_10", vaccineName: "Pneumococica 10-valente", doseNumber: 2, minAgeMonths: 4 },
  { vaccineCode: "PNEUMO_10", vaccineName: "Pneumococica 10-valente", doseNumber: 3, minAgeMonths: 12 },
  { vaccineCode: "ROTA", vaccineName: "Rotavirus", doseNumber: 1, minAgeMonths: 2 },
  { vaccineCode: "ROTA", vaccineName: "Rotavirus", doseNumber: 2, minAgeMonths: 4 },
  { vaccineCode: "MENINGO_C", vaccineName: "Meningococica C", doseNumber: 1, minAgeMonths: 3 },
  { vaccineCode: "MENINGO_C", vaccineName: "Meningococica C", doseNumber: 2, minAgeMonths: 5 },
  { vaccineCode: "MENINGO_C", vaccineName: "Meningococica C", doseNumber: 3, minAgeMonths: 12 },
  { vaccineCode: "FEBRE_AMARELA", vaccineName: "Febre amarela", doseNumber: 1, minAgeMonths: 9 },
  { vaccineCode: "TRIPLA_VIRAL", vaccineName: "Triplice viral (SCR)", doseNumber: 1, minAgeMonths: 12 },
  { vaccineCode: "TRIPLA_VIRAL", vaccineName: "Triplice viral (SCR)", doseNumber: 2, minAgeMonths: 15 },
  { vaccineCode: "DTP", vaccineName: "Triplice bacteriana (DTP)", doseNumber: 1, minAgeMonths: 15 },
  { vaccineCode: "DTP", vaccineName: "Triplice bacteriana (DTP)", doseNumber: 2, minAgeMonths: 48 },
  { vaccineCode: "HPV", vaccineName: "HPV", doseNumber: 1, minAgeMonths: 108 },
  { vaccineCode: "HPV", vaccineName: "HPV", doseNumber: 2, minAgeMonths: 114 },
];

/** Extra vaccines for manual registration (not in PNI childhood table). */
export const EXTRA_VACCINES: VaccineCatalogItem[] = [
  { code: "COVID_19", name: "COVID-19" },
  { code: "INFLUENZA", name: "Influenza (gripe)" },
  { code: "HERPES_ZOSTER", name: "Herpes zoster" },
  { code: "HEP_A", name: "Hepatite A" },
  { code: "VARICELA", name: "Varicela" },
  { code: "DENGUE", name: "Dengue" },
  { code: "OTHER", name: "Outra" },
];

export const VACCINE_CATALOG: VaccineCatalogItem[] = [
  ...Array.from(
    new Map(PNI_SCHEDULE.map((d) => [d.vaccineCode, { code: d.vaccineCode, name: d.vaccineName }])).values(),
  ),
  ...EXTRA_VACCINES,
];

function addMonths(isoDate: string, months: number): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  return date;
}

function findAdministered(
  administered: AdministeredVaccine[],
  code: string,
  dose: number,
): AdministeredVaccine | undefined {
  return administered.find((a) => a.vaccineCode === code && a.doseNumber === dose);
}

const OVERDUE_GRACE_DAYS = 30;

export function computeScheduleStatus(
  dateOfBirth: string | null | undefined,
  administered: AdministeredVaccine[],
): ScheduleRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dateOfBirth) {
    return PNI_SCHEDULE.map((dose) => {
      const match = findAdministered(administered, dose.vaccineCode, dose.doseNumber);
      return {
        ...dose,
        status: match ? "done" : "upcoming",
        recommendedDate: null,
        administeredAt: match?.administeredAt ?? null,
      };
    });
  }

  return PNI_SCHEDULE.map((dose) => {
    const match = findAdministered(administered, dose.vaccineCode, dose.doseNumber);
    const recommended = addMonths(dateOfBirth, dose.minAgeMonths);
    const recommendedIso = recommended.toISOString().slice(0, 10);

    if (match) {
      return {
        ...dose,
        status: "done",
        recommendedDate: recommendedIso,
        administeredAt: match.administeredAt,
      };
    }

    const overdueCutoff = new Date(recommended);
    overdueCutoff.setDate(overdueCutoff.getDate() + OVERDUE_GRACE_DAYS);

    let status: ScheduleStatus;
    if (today > overdueCutoff) status = "overdue";
    else if (today >= recommended) status = "pending";
    else status = "upcoming";

    return {
      ...dose,
      status,
      recommendedDate: recommendedIso,
      administeredAt: null,
    };
  });
}

export function vaccineNameForCode(code: string): string {
  return VACCINE_CATALOG.find((v) => v.code === code)?.name ?? code;
}
