import { NextRequest } from "next/server";
import { assertCsvImportSize } from "@/lib/csv-import-limits";

export type CsvImportPayload =
  | { ok: true; csvText: string; filename?: string }
  | { ok: false; error: string; status: number };

/** Reads CSV from multipart file or JSON body `{ csv, filename? }` with size limits. */
export async function parseCsvImportRequest(req: NextRequest): Promise<CsvImportPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "Arquivo CSV obrigatório", status: 400 };
    }
    const sizeErr = assertCsvImportSize(file.size);
    if (sizeErr) return { ok: false, error: sizeErr, status: 400 };
    return { ok: true, csvText: await file.text(), filename: file.name };
  }

  const body = await req.json();
  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return { ok: false, error: "Campo csv obrigatório", status: 400 };
  }
  const sizeErr = assertCsvImportSize(Buffer.byteLength(body.csv, "utf8"));
  if (sizeErr) return { ok: false, error: sizeErr, status: 400 };
  return {
    ok: true,
    csvText: body.csv,
    filename: typeof body.filename === "string" ? body.filename : undefined,
  };
}
