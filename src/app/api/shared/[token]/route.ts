// src/app/api/shared/[token]/route.ts
// Public endpoint — validates a share token and returns the content
// No authentication required (public link)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

// Patient name fields are stored encrypted (PHI). Decrypt for display,
// falling back to the raw value if it isn't encrypted.
function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const shared = await db.sharedRecord.findUnique({
    where: { accessToken: token },
    include: {
      document: { select: { title: true, type: true, content: true, createdAt: true } },
      patient: { select: { firstName: true, lastName: true, bloodType: true } },
    },
  });

  if (!shared) {
    return NextResponse.json({ error: "Link not found or has been revoked." }, { status: 404 });
  }

  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  // Mark as viewed
  if (!shared.viewedAt) {
    await db.sharedRecord.update({
      where: { id: shared.id },
      data: { viewedAt: new Date() },
    });
  }

  let content: Record<string, unknown> = {};
  if (shared.document.content) {
    try { content = JSON.parse(shared.document.content); } catch { content = {}; }
  }

  return NextResponse.json({
    title: shared.document.title,
    type: shared.document.type,
    patientName: `${safeDecrypt(shared.patient.firstName)} ${safeDecrypt(shared.patient.lastName)}`.trim(),
    createdAt: shared.document.createdAt,
    expiresAt: shared.expiresAt,
    content,
  });
}
