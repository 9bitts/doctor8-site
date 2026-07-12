import { NextRequest, NextResponse } from "next/server";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import {
  parseInventoryCsv,
  applyInventoryImport,
} from "@/lib/pharmacy-store-inventory-import";
import { assertCsvRowCount } from "@/lib/csv-import-limits";
import { parseCsvImportRequest } from "@/lib/csv-import-request";

export async function POST(req: NextRequest) {
  const ctx = await requirePharmacyStore(undefined, { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const payload = await parseCsvImportRequest(req);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: payload.status });
  }

  const { rows, errors: parseErrors } = parseInventoryCsv(payload.csvText);
  const rowErr = assertCsvRowCount(rows.length);
  if (rowErr) return NextResponse.json({ error: rowErr }, { status: 400 });

  const result = await applyInventoryImport(ctx.pharmacyStoreId, rows, parseErrors);

  const batch = await db.pharmacyStoreInventoryImport.create({
    data: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      filename: payload.filename,
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
