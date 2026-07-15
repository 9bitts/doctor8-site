import { buildPrescriptionPdf, type PrescriptionPdfData, type Lang } from "@/lib/prescription-pdf";
import {
  buildControlledPrescriptionPdf,
  isControlledFormKind,
  type ControlledPrescriptionPdfData,
} from "@/lib/controlled-prescription-pdf";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

export type BuildPrescriptionPdfInput = {
  formKind: PrescriptionFormKind | string | null | undefined;
  lang: Lang;
  simple: Omit<PrescriptionPdfData, "lang">;
  controlled?: Omit<ControlledPrescriptionPdfData, "lang" | "formKind"> & {
    formKind: "NRB" | "RCE";
  };
};

/** Route to the correct PDF builder (simple vs NRB vs RCE). */
export async function buildPrescriptionPdfByFormKind(
  input: BuildPrescriptionPdfInput,
): Promise<Uint8Array> {
  const kind = input.formKind as PrescriptionFormKind | null | undefined;
  if (kind && isControlledFormKind(kind) && input.controlled) {
    return buildControlledPrescriptionPdf({
      lang: input.lang,
      ...input.controlled,
    });
  }
  return buildPrescriptionPdf({ lang: input.lang, ...input.simple });
}
