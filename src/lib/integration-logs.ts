import { db } from "@/lib/db";

export async function logQStashJob(params: {
  appointmentId?: string;
  jobType: string;
  status: "sent" | "skipped" | "failed";
  detail?: string;
}): Promise<void> {
  try {
    await db.qStashJobLog.create({
      data: {
        appointmentId: params.appointmentId,
        jobType: params.jobType,
        status: params.status,
        detail: params.detail?.slice(0, 500),
      },
    });
  } catch (e) {
    console.error("[QSTASH LOG]", e);
  }
}

export async function logWhatsAppDelivery(params: {
  messageId?: string;
  phone?: string;
  template?: string;
  status: string;
  detail?: string;
}): Promise<void> {
  try {
    await db.whatsAppDeliveryLog.create({
      data: {
        messageId: params.messageId,
        phone: params.phone?.replace(/\d(?=\d{4})/g, "*"),
        template: params.template,
        status: params.status,
        detail: params.detail?.slice(0, 500),
      },
    });
  } catch (e) {
    console.error("[WHATSAPP LOG]", e);
  }
}
