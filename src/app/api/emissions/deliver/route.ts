import { NextRequest, NextResponse } from "next/server";
import { deliverEmissionToPatient, type EmissionDeliverKind } from "@/lib/emission-deliver";
import { logQStashJob } from "@/lib/integration-logs";
import { verifyQStashSignature } from "@/lib/qstash";

/** QStash consumer — retry prescription/exam/document delivery to patient. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!(await verifyQStashSignature(req, rawBody))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    professionalUserId?: string;
    kind?: EmissionDeliverKind;
    id?: string;
    sendWhatsApp?: boolean;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { professionalUserId, kind, id, sendWhatsApp } = body;
  if (!professionalUserId || !kind || !id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const result = await deliverEmissionToPatient(professionalUserId, kind, id, {
      sendWhatsApp: sendWhatsApp ?? true,
    });

    if ("error" in result) {
      await logQStashJob({
        jobType: "emission_delivery",
        status: "failed",
        detail: `${kind}/${id}: ${result.error}`,
      });
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logQStashJob({
      jobType: "emission_delivery",
      status: "sent",
      detail: `${kind}/${id} delivered=${result.delivered}`,
    });

    return NextResponse.json({ ok: true, delivered: result.delivered });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logQStashJob({
      jobType: "emission_delivery",
      status: "failed",
      detail: `${kind}/${id}: ${message}`,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
