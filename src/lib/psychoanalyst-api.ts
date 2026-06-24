import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

/** Plain-text in DB; legacy rows may still hold PatientProfile ciphertext after manual conversion. */
export function decryptPsychoanalystNameFields<T extends { firstName: string; lastName: string }>(
  row: T
): T {
  return {
    ...row,
    firstName: safeDecrypt(row.firstName),
    lastName: safeDecrypt(row.lastName),
  };
}

export async function requirePsychoanalyst() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "PSYCHOANALYST") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const psychoanalyst = await db.psychoanalystProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!psychoanalyst) {
    return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  }

  return { session, psychoanalyst };
}
