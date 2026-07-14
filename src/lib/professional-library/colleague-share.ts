import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendColleagueResourceInvite } from "@/lib/email";
import { getProfessionInfo } from "@/lib/profession-label";

export type ColleagueKind = "health" | "psychoanalyst" | "integrative";

export type ColleagueSearchResult = {
  id: string;
  kind: ColleagueKind;
  name: string;
  specialty: string;
  email: string;
};

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

function displayName(
  kind: ColleagueKind,
  firstName: string,
  lastName: string,
  specialty?: string,
): string {
  const name = `${firstName} ${lastName}`.trim();
  if (kind === "psychoanalyst") return name;
  if (kind === "integrative") return name;
  const { typeKey } = getProfessionInfo(specialty || "General Practice");
  if (typeKey === "psychologist") return name;
  if (typeKey === "nutritionist") return `Nutr. ${name}`;
  if (typeKey === "nurse") return `Enf. ${name}`;
  if (typeKey === "dentist") return `Dent. ${name}`;
  if (typeKey === "pharmacist") return name;
  return `Dr. ${name}`;
}

export async function searchColleagues(
  userId: string,
  q: string,
): Promise<ColleagueSearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const [pros, analysts, integrative] = await Promise.all([
    db.professionalProfile.findMany({
      where: {
        userId: { not: userId },
        verified: true,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { specialty: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        user: { select: { email: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
    }),
    db.psychoanalystProfile.findMany({
      where: {
        userId: { not: userId },
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 5,
    }),
    db.integrativeTherapistProfile.findMany({
      where: {
        userId: { not: userId },
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 5,
    }),
  ]);

  const results: ColleagueSearchResult[] = [
    ...pros.map((p) => ({
      id: p.id,
      kind: "health" as const,
      name: displayName("health", p.firstName, p.lastName, p.specialty),
      specialty: p.specialty,
      email: p.user.email,
    })),
    ...analysts.map((p) => ({
      id: p.id,
      kind: "psychoanalyst" as const,
      name: displayName("psychoanalyst", p.firstName, p.lastName),
      specialty: "Psychoanalyst",
      email: p.user.email,
    })),
    ...integrative.map((p) => ({
      id: p.id,
      kind: "integrative" as const,
      name: displayName("integrative", p.firstName, p.lastName),
      specialty: "Integrative Therapist",
      email: p.user.email,
    })),
  ];

  return results.slice(0, 15);
}

type ResourceOwner = {
  resource: {
    id: string;
    title: string;
    url: string | null;
    professionalId: string | null;
    psychoanalystId: string | null;
    integrativeTherapistId: string | null;
  };
  senderKind: ColleagueKind;
  senderName: string;
};

async function getResourceOwner(userId: string, resourceId: string): Promise<ResourceOwner | null> {
  const resource = await db.resource.findFirst({
    where: { id: resourceId, active: true },
  });
  if (!resource) return null;

  const [pro, analyst, integrative] = await Promise.all([
    db.professionalProfile.findUnique({ where: { userId } }),
    db.psychoanalystProfile.findUnique({ where: { userId } }),
    db.integrativeTherapistProfile.findUnique({ where: { userId } }),
  ]);

  if (pro && resource.professionalId === pro.id) {
    return {
      resource,
      senderKind: "health",
      senderName: displayName("health", pro.firstName, pro.lastName, pro.specialty),
    };
  }
  if (analyst && resource.psychoanalystId === analyst.id) {
    return {
      resource,
      senderKind: "psychoanalyst",
      senderName: displayName("psychoanalyst", analyst.firstName, analyst.lastName),
    };
  }
  if (integrative && resource.integrativeTherapistId === integrative.id) {
    return {
      resource,
      senderKind: "integrative",
      senderName: displayName("integrative", integrative.firstName, integrative.lastName),
    };
  }
  return null;
}

async function resolveRecipient(
  kind: ColleagueKind,
  id: string,
): Promise<{ userId: string; email: string; name: string } | null> {
  if (kind === "health") {
    const p = await db.professionalProfile.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, specialty: true, user: { select: { id: true, email: true } } },
    });
    if (!p) return null;
    return {
      userId: p.user.id,
      email: p.user.email,
      name: displayName("health", p.firstName, p.lastName, p.specialty),
    };
  }
  if (kind === "psychoanalyst") {
    const p = await db.psychoanalystProfile.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, user: { select: { id: true, email: true } } },
    });
    if (!p) return null;
    return {
      userId: p.user.id,
      email: p.user.email,
      name: displayName("psychoanalyst", p.firstName, p.lastName),
    };
  }
  const p = await db.integrativeTherapistProfile.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, user: { select: { id: true, email: true } } },
  });
  if (!p) return null;
  return {
    userId: p.user.id,
    email: p.user.email,
    name: displayName("integrative", p.firstName, p.lastName),
  };
}

export async function shareResourceWithColleague(
  userId: string,
  resourceId: string,
  body: {
    professionalId?: string;
    recipientKind?: ColleagueKind;
    recipientId?: string;
    email?: string;
    name?: string;
    phone?: string;
  },
  senderLanguage?: string | null,
): Promise<{ ok: true; mode: "notified" | "invited" } | { error: string; status: number }> {
  const owned = await getResourceOwner(userId, resourceId);
  if (!owned) return { error: "Resource not found", status: 404 };

  const resourceTitle = safeDecrypt(owned.resource.title);
  const resourceUrl = owned.resource.url || null;

  const recipientKind: ColleagueKind | undefined =
    body.recipientKind ??
    (body.professionalId ? "health" : undefined);
  const recipientId = body.recipientId ?? body.professionalId;

  if (recipientKind && recipientId) {
    const recipient = await resolveRecipient(recipientKind, recipientId);
    if (!recipient) return { error: "Colleague not found", status: 404 };

    await db.notification
      .create({
        data: {
          userId: recipient.userId,
          type: "DOCUMENT_SHARED",
          title: "Recurso compartilhado por colega",
          body: `${owned.senderName} compartilhou "${resourceTitle}" com você.`,
          data: JSON.stringify({
            resourceId,
            resourceUrl,
            titleKey: "notif.colleagueResource.title",
            bodyKey: "notif.colleagueResource.body",
            bodyParams: { sender: owned.senderName, title: resourceTitle },
          }),
        },
      })
      .catch(() => {});

    await sendColleagueResourceInvite({
      email: recipient.email,
      recipientName: recipient.name,
      senderName: owned.senderName,
      resourceTitle,
      resourceUrl,
      loginUrl: true,
      language: senderLanguage ?? undefined,
    }).catch(() => {});

    return { ok: true, mode: "notified" };
  }

  if (!body.email?.trim()) {
    return { error: "email required", status: 400 };
  }

  await sendColleagueResourceInvite({
    email: body.email.trim(),
    recipientName: body.name?.trim() || body.email.trim(),
    senderName: owned.senderName,
    resourceTitle,
    resourceUrl,
    loginUrl: false,
    whatsappPhone: body.phone?.trim() || null,
    language: senderLanguage ?? undefined,
  }).catch(() => {});

  return { ok: true, mode: "invited" };
}
