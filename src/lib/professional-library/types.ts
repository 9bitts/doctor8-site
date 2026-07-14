/** Profession keys for library personalization (login + specialty). */
export type LibraryProfessionKey =
  | "doctor"
  | "psychologist"
  | "nutritionist"
  | "nurse"
  | "pharmacist"
  | "dentist"
  | "psychoanalyst"
  | "integrative_therapist";

export type LibraryProviderKind = "health" | "psychoanalyst" | "integrative";

export type ResourceCategory =
  | "general"
  | "condition"
  | "medication"
  | "lifestyle"
  | "procedure"
  | "mental_health"
  | "nutrition"
  | "dental"
  | "integrative"
  | "parenting"
  | "other";

export type ResourceContentType = "link" | "file" | "text";

export interface LibraryPackItemDef {
  titleKey: string;
  descKey?: string;
  url?: string;
  contentKey?: string;
  contentType: ResourceContentType;
  category?: ResourceCategory;
}

export interface LibraryPackDef {
  id: string;
  professionKeys: LibraryProfessionKey[];
  titleKey: string;
  descKey: string;
  category: ResourceCategory;
  /** Optional CID-10 prefixes for contextual suggestions (e.g. I10 for hypertension). */
  cidPrefixes?: string[];
  items: LibraryPackItemDef[];
}

export interface LibraryReferenceDef {
  id: string;
  professionKeys: LibraryProfessionKey[];
  titleKey: string;
  descKey: string;
  href: string;
  external?: boolean;
  icon: "book" | "leaf" | "flower" | "brain" | "pill" | "stethoscope" | "utensils" | "heart" | "microscope";
}

export interface LibraryOwnerIds {
  kind: LibraryProviderKind;
  professionalId?: string;
  psychoanalystId?: string;
  integrativeTherapistId?: string;
  specialty?: string | null;
  professionKey: LibraryProfessionKey;
}

export interface LibraryResourceDto {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  hasFile: boolean;
  contentType: ResourceContentType;
  category: ResourceCategory;
  collectionId: string | null;
  collectionTitle: string | null;
  sourcePackId: string | null;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryCollectionDto {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  resourceCount: number;
  shareCount: number;
  createdAt: string;
}

export interface LibraryShareStats {
  totalShares: number;
  totalViews: number;
  openRate: number;
}
