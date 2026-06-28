import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import {
  bearerTokenFromRequest,
  scopeAllowsPatientRead,
  validateAccessToken,
} from "@/lib/fhir/smart-oauth";
import { buildFhirBundleForPatient, buildFhirPatientResource } from "@/lib/fhir/load-patient-fhir";

type RouteParams = { params: { path?: string[] } };

function fhirJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/fhir+json" },
  });
}

function fhirError(status: number, code: string, diagnostics: string) {
  return fhirJson(
    {
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code, diagnostics }],
    },
    status,
  );
}

async function authorize(req: NextRequest, patientId: string) {
  const token = bearerTokenFromRequest(req);
  if (!token) return null;
  const ctx = await validateAccessToken(token);
  if (!ctx || !scopeAllowsPatientRead(ctx.scope)) return null;
  if (ctx.patientId !== patientId) return null;
  return ctx;
}

/** FHIR R4 read API ? Bearer token (SMART) for Patient + $everything bundle. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const segments = params.path || [];
  if (segments.length === 0) {
    return NextResponse.redirect(new URL("/fhir/metadata", req.url));
  }

  if (segments[0] !== "Patient" || !segments[1]) {
    return fhirError(404, "not-found", "Resource not found.");
  }

  const patientId = segments[1];
  const operation = segments[2];
  const ctx = await authorize(req, patientId);
  if (!ctx) return fhirError(401, "security", "Valid Bearer access token required.");

  if (operation === "$everything" || operation === "everything") {
    const bundle = await buildFhirBundleForPatient(patientId, ctx.userId);
    if (!bundle) return fhirError(404, "not-found", "Patient not found.");
    await audit.exportData(ctx.userId);
    return fhirJson(bundle);
  }

  if (operation) {
    return fhirError(404, "not-found", "Operation not supported.");
  }

  const patient = await buildFhirPatientResource(patientId, ctx.userId);
  if (!patient) return fhirError(404, "not-found", "Patient not found.");
  await audit.exportData(ctx.userId);
  return fhirJson(patient);
}
