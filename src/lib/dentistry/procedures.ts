// Common dental procedures catalog (TUSS-inspired codes for Brazilian clinics).

export type DentalProcedure = {
  code: string;
  nameKey: string;
  defaultPriceCents: number;
  category: "preventive" | "restorative" | "endodontic" | "surgical" | "prosthetic" | "orthodontic" | "periodontal" | "esthetic";
};

export const DENTAL_PROCEDURES: DentalProcedure[] = [
  { code: "81000030", nameKey: "dental.proc.consultation", defaultPriceCents: 15000, category: "preventive" },
  { code: "81000049", nameKey: "dental.proc.cleaning", defaultPriceCents: 20000, category: "preventive" },
  { code: "81000057", nameKey: "dental.proc.fluoride", defaultPriceCents: 8000, category: "preventive" },
  { code: "81000065", nameKey: "dental.proc.sealant", defaultPriceCents: 12000, category: "preventive" },
  { code: "81000073", nameKey: "dental.proc.restoration", defaultPriceCents: 25000, category: "restorative" },
  { code: "81000081", nameKey: "dental.proc.crown", defaultPriceCents: 120000, category: "prosthetic" },
  { code: "81000090", nameKey: "dental.proc.rootCanal", defaultPriceCents: 80000, category: "endodontic" },
  { code: "81000103", nameKey: "dental.proc.extraction", defaultPriceCents: 30000, category: "surgical" },
  { code: "81000111", nameKey: "dental.proc.implant", defaultPriceCents: 350000, category: "surgical" },
  { code: "81000120", nameKey: "dental.proc.whitening", defaultPriceCents: 60000, category: "esthetic" },
  { code: "81000138", nameKey: "dental.proc.orthoMaintenance", defaultPriceCents: 35000, category: "orthodontic" },
  { code: "81000146", nameKey: "dental.proc.periodontalScaling", defaultPriceCents: 45000, category: "periodontal" },
  { code: "81000154", nameKey: "dental.proc.denture", defaultPriceCents: 250000, category: "prosthetic" },
  { code: "81000162", nameKey: "dental.proc.xrayPeriapical", defaultPriceCents: 4000, category: "preventive" },
  { code: "81000170", nameKey: "dental.proc.xrayPanoramic", defaultPriceCents: 12000, category: "preventive" },
];

export function findProcedure(code: string): DentalProcedure | undefined {
  return DENTAL_PROCEDURES.find((p) => p.code === code);
}
