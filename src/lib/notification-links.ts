// Maps in-app notification type + data to a dashboard route (or external URL).

export type NotificationRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

export function parseNotificationData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof data === "object" && data !== null) return data as Record<string, unknown>;
  return {};
}

function messagesPath(role: NotificationRole): string {
  return role === "PROFESSIONAL" ? "/professional/messages" : "/patient/messages";
}

function appointmentsPath(role: NotificationRole): string {
  return role === "PROFESSIONAL" ? "/professional/appointments" : "/patient/appointments";
}

function internalPathFromUrl(url: string): string | null {
  try {
    const u = new URL(url, "https://doctor8.app");
    if (u.pathname.startsWith("/")) return `${u.pathname}${u.search}`;
  } catch {
    /* ignore */
  }
  return null;
}

export function resolveNotificationHref(
  type: string,
  data: unknown,
  role: NotificationRole
): string | null {
  const d = parseNotificationData(data);
  const isPro = role === "PROFESSIONAL";

  if (typeof d.link === "string" && d.link.startsWith("/")) return d.link;

  if (typeof d.resourceUrl === "string" && d.resourceUrl.startsWith("http")) {
    return d.resourceUrl;
  }

  if (typeof d.shareUrl === "string") {
    if (d.shareUrl.startsWith("http")) {
      return internalPathFromUrl(d.shareUrl) ?? d.shareUrl;
    }
    if (d.shareUrl.startsWith("/")) return d.shareUrl;
  }

  if (typeof d.meetingUrl === "string" && d.meetingUrl.startsWith("http")) {
    return d.meetingUrl;
  }

  switch (type) {
    case "message": {
      if (typeof d.fromUserId === "string") {
        return `${messagesPath(role)}?with=${d.fromUserId}`;
      }
      if (typeof d.entryId === "string") return `/video/humanitarian/${d.entryId}`;
      if (typeof d.queueId === "string") return `/video/jit/${d.queueId}`;
      if (typeof d.link === "string" && d.link.startsWith("/")) return d.link;
      return messagesPath(role);
    }

    case "shared_record": {
      if (typeof d.documentId === "string") {
        return isPro
          ? `/professional/shared?documentId=${d.documentId}`
          : `/patient/documents?documentId=${d.documentId}`;
      }
      return isPro ? "/professional/shared" : "/patient/documents";
    }

    case "appointment_reminder":
    case "appointment_confirmed": {
      if (typeof d.appointmentId === "string") {
        return `${appointmentsPath(role)}?id=${d.appointmentId}`;
      }
      return appointmentsPath(role);
    }

    case "DOCUMENT_SHARED": {
      if (typeof d.resourceId === "string") {
        return `/professional/resources?resourceId=${d.resourceId}`;
      }
      if (typeof d.documentId === "string") {
        return `/patient/documents?documentId=${d.documentId}`;
      }
      return isPro ? "/professional/resources" : "/patient/documents";
    }

    case "payment":
      return isPro ? "/professional/financeiro" : "/patient/subscription";

    case "favorite_online":
      if (typeof d.professionalId === "string") {
        return `/patient/find?pro=${d.professionalId}`;
      }
      return "/patient/find";

    case "system": {
      if (d.kind === "favorite_online" && typeof d.professionalId === "string") {
        return `/patient/find?pro=${d.professionalId}`;
      }
      if (typeof d.prescriptionId === "string") {
        return isPro ? "/professional/prescriptions" : "/patient/prescriptions";
      }
      if (typeof d.documentId === "string") {
        return isPro
          ? `/professional/shared?documentId=${d.documentId}`
          : `/patient/documents?documentId=${d.documentId}`;
      }
      if (typeof d.appointmentId === "string") {
        return `${appointmentsPath(role)}?id=${d.appointmentId}`;
      }
      if (typeof d.queueId === "string") return `/video/jit/${d.queueId}`;
      if (typeof d.entryId === "string") return `/video/humanitarian/${d.entryId}`;
      if (typeof d.link === "string" && d.link.startsWith("/")) return d.link;
      if (typeof d.sessionId === "string") return "/urgent";
      return null;
    }

    default:
      return null;
  }
}

export function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}
