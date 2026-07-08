import { NextRequest, NextResponse } from "next/server";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import {
  parseInventoryCsv,
  applyInventoryImport,
} from "@/lib/pharmacy-store-inventory-import";

export async function POST(req: NextRequest) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const contentType = req.headers.get("content-type") || "";
  let csvText = "";
  let filename: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo CSV obrigatório" }, { status: 400 });
    }
    filename = file.name;
    csvText = await file.text();
  } else {
    const body = await req.json();
    if (typeof body.csv !== "string" || !body.csv.trim()) {
      return NextResponse.json({ error: "Campo csv obrigatório" }, { status: 400 });
    }
    csvText = body.csv;
    filename = typeof body.filename === "string" ? body.filename : undefined;
  }

  const { rows, errors: parseErrors } = parseInventoryCsv(csvText);
  const result = await applyInventoryImport(ctx.pharmacyStoreId, rows, parseErrors);

  const batch = await db.pharmacyStoreInventoryImport.create({
    data: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      filename,
      rowsTotal: result.rowsTotal,
      rowsMatched: result.rowsMatched,
      rowsCreated: result.rowsCreated,
      rowsUpdated: result.rowsUpdated,
      rowsSkipped: result.rowsSkipped,
      errorsJson: result.errors.length > 0 ? result.errors : undefined,
      importedByUserId: ctx.userId,
    },
  });

  return NextResponse.json({ result, importId: batch.id });
}
