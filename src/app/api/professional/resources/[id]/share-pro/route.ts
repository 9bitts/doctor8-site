// src/app/api/professional/resources/[id]/share-pro/route.ts
// POST — share a resource with another professional
// Two cases:
//   A) professional has a Doctor8 account → send notification + email
//   B) professional has no account       → send invite email (like patient invite)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendColleagueResourceInvite } from "@/lib/email";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.professionalId !== professional.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { professionalId, email, name, phone } = body;

  const senderName = `Dr. ${professional.firstName} ${professional.lastName}`;
  const resourceTitle = safeDecrypt(resource.title);
  const resourceUrl = resource.url || null;

  // Case A: recipient already has a Doctor8 account
  if (professionalId) {
    const recipient = await db.professionalProfile.findUnique({
      where: { id: professionalId },
      select: { user: { select: { id: true, email: true } }, firstName: true, lastName: true },
    });
    if (!recipient) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

    // Create notification
    await db.notification.create({
      data: {
        userId: recipient.user.id,
        type:   "DOCUMENT_SHARED",
        title:  "Recurso compartilhado por colega",
        body:   `${senderName} compartilhou "${resourceTitle}" com você.`,
        data:   JSON.stringify({
          resourceId: params.id,
          resourceUrl,
          titleKey: "notif.colleagueResource.title",
          bodyKey: "notif.colleagueResource.body",
          bodyParams: { sender: senderName, title: resourceTitle },
        }),
      },
    }).catch(() => {});

    // Send email
    await sendColleagueResourceInvite({
      email:         recipient.user.email,
      recipientName: `Dr. ${recipient.firstName} ${recipient.lastName}`,
      senderName,
      resourceTitle,
      resourceUrl,
      loginUrl:      true,
    }).catch(() => {});

    return NextResponse.json({ ok: true, mode: "notified" });
  }

  // Case B: no account — send invite email
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  await sendColleagueResourceInvite({
    email,
    recipientName: name || email,
    senderName,
    resourceTitle,
    resourceUrl,
    loginUrl: false,
    whatsappPhone: phone || null,
  }).catch(() => {});

  return NextResponse.json({ ok: true, mode: "invited" });
}
