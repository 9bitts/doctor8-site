import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getAngelProfilePayload, updateAngelProfile } from "@/lib/humanitarian/angel-profile";

const patchSchema = z.object({
  languages: z.array(z.string().max(40)).max(12).optional(),
  skills: z.array(z.string().max(40)).max(20).optional(),
  city: z.string().max(120).nullable().optional(),
  hasVehicle: z.boolean().optional(),
  availabilityNote: z.string().max(500).nullable().optional(),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "PAUSED"]).optional(),
  pausedUntil: z.string().datetime().nullable().optional(),
  weeklyCapacity: z.number().int().min(1).max(10).nullable().optional(),
  requestTracks: z.array(z.enum([
    "ESCUTA", "CAMPO", "ENTREGAS", "PROFISSIONAL", "INTERPRETE", "RETAGUARDA", "EDUCADOR", "EMBAIXADOR",
  ])).max(8).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const profile = await getAngelProfilePayload(session.user.id);
  if (!profile) {
    return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await updateAngelProfile(session.user.id, parsed.data);
  if (!profile) {
    return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
