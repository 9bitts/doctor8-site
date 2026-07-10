// Maps in-app notification type + data to a dashboard route (or external URL).

import {
  mapProfessionalPathForSpecialty,
  professionalPortalBaseFromSpecialty,
} from "@/lib/psychologist-portal";

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

function proPortal(role: NotificationRole, specialty?: string | null): string {
  if (role !== "PROFESSIONAL") return "/professional";
  return professionalPortalBaseFromSpecialty(specialty);
}

function messagesPath(role: NotificationRole, specialty?: string | null): string {
  return role === "PROFESSIONAL"
    ? `${proPortal(role, specialty)}/messages`
    : "/patient/messages";
}

function appointmentsPath(role: NotificationRole, specialty?: string | null): string {
  return role === "PROFESSIONAL"
    ? `${proPortal(role, specialty)}/appointments`
    : "/patient/appointments";
}

function mapProPath(
  role: NotificationRole,
  specialty: string | null | undefined,
  path: string,
): string {
  if (role !== "PROFESSIONAL") return path;
  return mapProfessionalPathForSpecialty(specialty, path);
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
  role: NotificationRole,
  professionalSpecialty?: string | null,
): string | null {
  const d = parseNotificationData(data);
  const isPro = role === "PROFESSIONAL";
  const portal = proPortal(role, professionalSpecialty);

  if (typeof d.link === "string" && d.link.startsWith("/")) {
    return mapProPath(role, professionalSpecialty, d.link);
  }

  if (typeof d.resourceUrl === "string" && d.resourceUrl.startsWith("http")) {
    return d.resourceUrl;
  }

  if (typeof d.shareUrl === "string") {
    if (d.shareUrl.startsWith("http")) {
      return internalPathFromUrl(d.shareUrl) ?? d.shareUrl;
    }
    if (d.shareUrl.startsWith("/")) {
      return mapProPath(role, professionalSpecialty, d.shareUrl);
    }
  }

  if (typeof d.meetingUrl === "string" && d.meetingUrl.startsWith("http")) {
    if (typeof d.appointmentId === "string") return `/video/${d.appointmentId}`;
    return d.meetingUrl;
  }

  switch (type) {
    case "message": {
      if (typeof d.fromUserId === "string") {
        return `${messagesPath(role, professionalSpecialty)}?with=${d.fromUserId}`;
      }
      if (typeof d.entryId === "string") return `/video/humanitarian/${d.entryId}`;
      if (typeof d.queueId === "string") return `/video/jit/${d.queueId}`;
      if (typeof d.link === "string" && d.link.startsWith("/")) {
        return mapProPath(role, professionalSpecialty, d.link);
      }
      return messagesPath(role, professionalSpecialty);
    }

    case "referral": {
      if (isPro && typeof d.fromUserId === "string") {
        return `${messagesPath(role, professionalSpecialty)}?with=${d.fromUserId}`;
      }
      if (typeof d.bookingUrl === "string") {
        const internal = d.bookingUrl.startsWith("/")
          ? d.bookingUrl
          : internalPathFromUrl(d.bookingUrl);
        if (internal) return internal;
      }
      if (typeof d.targetProfessionalId === "string") {
        return `/patient/appointments?pro=${d.targetProfessionalId}&from=referral`;
      }
      if (typeof d.link === "string" && d.link.startsWith("/")) {
        return mapProPath(role, professionalSpecialty, d.link);
      }
      return role === "PATIENT" ? "/patient/appointments" : messagesPath(role, professionalSpecialty);
    }

    case "shared_record": {
      if (typeof d.documentId === "string") {
        return isPro
          ? `${portal}/shared?documentId=${d.documentId}`
          : `/patient/documents?documentId=${d.documentId}`;
      }
      return isPro ? `${portal}/shared` : "/patient/documents";
    }

    case "appointment_reminder":
    case "appointment_confirmed":
    case "appointment_booked": {
      if (typeof d.appointmentId === "string") {
        return `${appointmentsPath(role, professionalSpecialty)}?id=${d.appointmentId}`;
      }
      return appointmentsPath(role, professionalSpecialty);
    }

    case "DOCUMENT_SHARED": {
      if (typeof d.resourceId === "string") {
        return `${portal}/resources?resourceId=${d.resourceId}`;
      }
      if (typeof d.documentId === "string") {
        return `/patient/documents?documentId=${d.documentId}`;
      }
      return isPro ? `${portal}/resources` : "/patient/documents";
    }

    case "payment":
      return isPro ? `${portal}/financeiro` : "/patient/club-doctor";

    case "favorite_online":
      if (typeof d.professionalId === "string") {
        return `/patient/find?pro=${d.professionalId}`;
      }
      return "/patient/find";

    case "system": {
      if (d.kind === "post_consult_notes") {
        if (typeof d.link === "string" && d.link.startsWith("/")) {
          return mapProPath(role, professionalSpecialty, d.link);
        }
        if (typeof d.url === "string" && d.url.startsWith("/")) {
          return mapProPath(role, professionalSpecialty, d.url);
        }
        if (typeof d.appointmentId === "string") {
          return isPro
            ? `${portal}/appointments#appt-${d.appointmentId}`
            : `${appointmentsPath(role, professionalSpecialty)}?id=${d.appointmentId}`;
        }
      }
      if (d.kind === "favorite_online" && typeof d.professionalId === "string") {
        return `/patient/find?pro=${d.professionalId}`;
      }
      if (typeof d.prescriptionId === "string") {
        return isPro
          ? `${proPortal(role, professionalSpecialty)}/prescriptions`
          : "/patient/prescriptions";
      }
      if (typeof d.documentId === "string") {
        return isPro
          ? `${portal}/shared?documentId=${d.documentId}`
          : `/patient/documents?documentId=${d.documentId}`;
      }
      if (typeof d.appointmentId === "string") {
        return `${appointmentsPath(role, professionalSpecialty)}?id=${d.appointmentId}`;
      }
      if (typeof d.queueId === "string") return `/video/jit/${d.queueId}`;
      if (typeof d.entryId === "string") return `/video/humanitarian/${d.entryId}`;
      if (typeof d.link === "string" && d.link.startsWith("/")) {
        return mapProPath(role, professionalSpecialty, d.link);
      }
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
