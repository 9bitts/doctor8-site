import { NextRequest, NextResponse } from "next/server";
import { requireLaboratory } from "@/lib/laboratory-auth";
import { db } from "@/lib/db";
import { parseExamCsv, applyExamImport, examCsvTemplate } from "@/lib/laboratory-exam-import";
import { assertCsvRowCount } from "@/lib/csv-import-limits";
import { parseCsvImportRequest } from "@/lib/csv-import-request";

export async function GET(req: NextRequest) {
  const ctx = await requireLaboratory();
  if ("error" in ctx) return ctx.error;

  const format = req.nextUrl.searchParams.get("format");
  if (format === "template") {
    const lab = await db.laboratory.findUnique({ where: { id: ctx.laboratoryId } });
    const csv = examCsvTemplate(lab?.labType ?? "BOTH");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modelo-exames-laboratorio.csv"',
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const ctx = await requireLaboratory(undefined, { requireActive: true });
  if ("error" in ctx) return ctx.error;

  const lab = await db.laboratory.findUnique({ where: { id: ctx.laboratoryId } });
  if (!lab) {
    return NextResponse.json({ error: "Laboratório não encontrado" }, { status: 404 });
  }

  const payload = await parseCsvImportRequest(req);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: payload.status });
  }

  const { rows, errors: parseErrors } = parseExamCsv(payload.csvText);
  const rowErr = assertCsvRowCount(rows.length);
  if (rowErr) return NextResponse.json({ error: rowErr }, { status: 400 });

  const result = await applyExamImport(ctx.laboratoryId, rows, parseErrors, lab.labType);

  const batch = await db.laboratoryExamImport.create({
    data: {
      laboratoryId: ctx.laboratoryId,
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
