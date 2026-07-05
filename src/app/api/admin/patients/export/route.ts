// ADMIN ONLY - export completed consultations as CSV by date range.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import {
  buildConsultationsCsv,
  loadConsultationsForExport,
} from "@/lib/admin/patient-consultations-export";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getPatientAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const consultFrom = sp.get("consultFrom");
  const consultTo = sp.get("consultTo");

  if (!consultFrom || !consultTo) {
    return NextResponse.json(
      { error: "consultFrom e consultTo sao obrigatorios" },
      { status: 400 },
    );
  }

  const fromDate = new Date(consultFrom);
  const toDate = new Date(consultTo);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Datas invalidas" }, { status: 400 });
  }
  if (fromDate > toDate) {
    return NextResponse.json(
      { error: "Data inicial deve ser anterior a data final" },
      { status: 400 },
    );
  }

  const rows = await loadConsultationsForExport(consultFrom, consultTo);
  const csv = buildConsultationsCsv(rows);
  const filename = `atendimentos_${consultFrom}_${consultTo}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
