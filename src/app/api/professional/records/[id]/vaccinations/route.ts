import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";
import { computeScheduleStatus, vaccineNameForCode } from "@/lib/vaccine-schedule";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

const createSchema = z.object({
  vaccineCode: z.string().min(1).max(40),
  vaccineName: z.string().min(1).max(200).optional(),
  doseNumber: z.number().int().min(1).max(20).default(1),
  administeredAt: z.string().min(1),
  network: z.enum(["PUBLIC", "PRIVATE", "OTHER"]).default("PUBLIC"),
  batchNumber: z.string().max(80).optional().or(z.literal("")),
  manufacturer: z.string().max(120).optional().or(z.literal("")),
  applicationSite: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, false, ctx.session.user.id);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  const { record } = found;

  const vaccinations = await db.patientVaccination.findMany({
    where: { patientRecordId: record.id },
    orderBy: [{ administeredAt: "desc" }],
  });

  const administered = vaccinations.map((v) => ({
    vaccineCode: v.vaccineCode,
    doseNumber: v.doseNumber,
    administeredAt: v.administeredAt.toISOString().slice(0, 10),
  }));

  const dob = record.dateOfBirth ? safeDecrypt(record.dateOfBirth) : null;
  const schedule = computeScheduleStatus(dob || null, administered);

  return NextResponse.json({
    dateOfBirth: dob || null,
    vaccinations: vaccinations.map((v) => ({
      id: v.id,
      vaccineCode: v.vaccineCode,
      vaccineName: v.vaccineName,
      doseNumber: v.doseNumber,
      administeredAt: v.administeredAt.toISOString(),
      network: v.network,
      batchNumber: v.batchNumber,
      manufacturer: v.manufacturer,
      applicationSite: v.applicationSite,
      notes: v.notes,
    })),
    schedule,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, true);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  const { record } = found;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const administeredAt = new Date(d.administeredAt);
  if (Number.isNaN(administeredAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const vaccineName = d.vaccineName?.trim() || vaccineNameForCode(d.vaccineCode);

  const vaccination = await db.patientVaccination.create({
    data: {
      patientRecordId: record.id,
      vaccineCode: d.vaccineCode,
      vaccineName,
      doseNumber: d.doseNumber,
      administeredAt,
      network: d.network,
      batchNumber: d.batchNumber || null,
      manufacturer: d.manufacturer || null,
      applicationSite: d.applicationSite || null,
      notes: d.notes || null,
      recordedById: professional.id,
    },
  });

  return NextResponse.json({
    id: vaccination.id,
    vaccineCode: vaccination.vaccineCode,
    vaccineName: vaccination.vaccineName,
    doseNumber: vaccination.doseNumber,
    administeredAt: vaccination.administeredAt.toISOString(),
    network: vaccination.network,
    batchNumber: vaccination.batchNumber,
    manufacturer: vaccination.manufacturer,
    applicationSite: vaccination.applicationSite,
    notes: vaccination.notes,
  }, { status: 201 });
}
