/**
 * Shared types for country drug catalog importers.
 */

export interface CountryDrugRecord {
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer: string | null;
  pharmaceuticalForm: string;
  dosage: string | null;
  externalCode: string;
  country: string;
  controlled?: boolean;
  prescriptionType?: string | null;
  category?: string | null;
}

export interface CountryAdapter {
  /** Human-readable country label for logs */
  countryName: string;
  /** Produces normalized records ready for upsert */
  loadRecords(): CountryDrugRecord[] | Promise<CountryDrugRecord[]>;
}

export interface UpsertStats {
  read: number;
  inserted: number;
  updated: number;
  ignored: number;
  otherForm: number;
  otherFormExamples: string[];
  noDosage: number;
}
