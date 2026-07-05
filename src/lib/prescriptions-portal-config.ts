export type PrescriptionsPortalId = "professional" | "integrative-therapist";

export interface PrescriptionsPortalConfig {
  portal: PrescriptionsPortalId;
  apiBase: string;
  /** Only fitoterápicos — hide drug search and conventional meds */
  phytoOnly: boolean;
  /** Skip Lacuna digital signature — deliver to patient only */
  skipDigitalSign: boolean;
  /** Hide exam/document flows in the hub */
  prescriptionsOnly: boolean;
  accountSignHref: string;
  chartRecordsPath: string;
  patientRecordField: "patientRecordId" | "integrativeClientRecordId";
}

const CONFIG: Record<PrescriptionsPortalId, PrescriptionsPortalConfig> = {
  professional: {
    portal: "professional",
    apiBase: "/api/professional",
    phytoOnly: false,
    skipDigitalSign: false,
    prescriptionsOnly: false,
    accountSignHref: "/professional/account#digital-sign",
    chartRecordsPath: "/api/professional/records",
    patientRecordField: "patientRecordId",
  },
  "integrative-therapist": {
    portal: "integrative-therapist",
    apiBase: "/api/integrative-therapist",
    phytoOnly: true,
    skipDigitalSign: true,
    prescriptionsOnly: true,
    accountSignHref: "/integrative-therapist/settings",
    chartRecordsPath: "/api/integrative-therapist/records",
    patientRecordField: "integrativeClientRecordId",
  },
};

export function getPrescriptionsPortalConfig(portal: PrescriptionsPortalId): PrescriptionsPortalConfig {
  return CONFIG[portal];
}

export function apiPath(config: PrescriptionsPortalConfig, suffix: string): string {
  return `${config.apiBase}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}
