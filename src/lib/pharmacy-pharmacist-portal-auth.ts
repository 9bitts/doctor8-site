import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { canAccessPharmacyPharmacistPortal } from "@/lib/pharmacy-portal-guards";

export {
  canAccessPharmacyPharmacistPortal,
  canAccessPharmacyStorePortal,
  canAccessPharmacyValidatePortal,
} from "@/lib/pharmacy-portal-guards";

export async function requirePharmacyPharmacistPortal(): Promise<
  | { ok: true; userId: string; specialty: string | null }
  | { error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { id: userId, role } = session.user;
  if (role === "ADMIN") {
    return { ok: true, userId, specialty: null };
  }

  if (role !== "PROFESSIONAL") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });

  if (!canAccessPharmacyPharmacistPortal(role, profile?.specialty)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, userId, specialty: profile?.specialty ?? null };
}
