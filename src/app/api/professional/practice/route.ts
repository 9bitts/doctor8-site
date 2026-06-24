import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureLegacyLocation,
  getPracticeLocations,
  getProviderServices,
  savePracticeLocations,
  saveProviderServices,
} from "@/lib/practice";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureLegacyLocation(profile.id, "health", profile);
  const locations = await getPracticeLocations(profile.id, "health");
  const services = await getProviderServices(profile.id, "health");

  return NextResponse.json({ locations, services, currency: profile.currency });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const locations = Array.isArray(body.locations) ? body.locations : [];
  const services = Array.isArray(body.services) ? body.services : [];

  await savePracticeLocations(profile.id, "health", locations);
  await saveProviderServices(profile.id, "health", services);

  return NextResponse.json({ ok: true });
}
