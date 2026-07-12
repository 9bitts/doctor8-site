import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { prescriptionQrUrl } from "@/lib/pharmacy-network/prescription-token";
import { decrypt } from "@/lib/encryption";
import {
  sendPharmacyOrderPaidStoreWhatsApp,
} from "@/lib/whatsapp";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export async function notifyPharmacyOrderPaid(orderId: string): Promise<void> {
  const order = await db.pharmacyOrder.findUnique({
    where: { id: orderId },
    include: {
      pharmacyStore: {
        select: {
          id: true,
          nomeFantasia: true,
          contactEmail: true,
          contactPhone: true,
          members: {
            where: { status: "ACTIVE" },
            select: { user: { select: { id: true, email: true } } },
          },
        },
      },
      items: true,
      prescriptionToken: { select: { token: true } },
      prescription: {
        select: {
          id: true,
          document: { select: { patient: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });
  if (!order || order.status !== "PAID") return;

  const appUrl = getAppUrl();
  const ordersUrl = `${appUrl}/farmacias/pedidos`;
  const patientOrdersUrl = `${appUrl}/patient/pharmacy/orders`;
  const total = formatBrl(order.totalCents);
  const itemList = order.items.map((i) => i.drugName).join(", ");
  const fulfillment =
    order.fulfillmentType === "DELIVERY" ? "Entrega em domicílio" : "Retirada na loja";

  const patientName = order.prescription?.document?.patient
    ? `${safeDecrypt(order.prescription.document.patient.firstName)} ${safeDecrypt(order.prescription.document.patient.lastName)}`.trim()
    : "Paciente";

  const validateUrl = order.prescriptionToken?.token
    ? prescriptionQrUrl(order.prescriptionToken.token)
    : null;

  // ── Farmácia: e-mail + in-app + WhatsApp ──
  const storeEmails = new Set<string>();
  if (order.pharmacyStore.contactEmail) storeEmails.add(order.pharmacyStore.contactEmail);
  for (const m of order.pharmacyStore.members) {
    if (m.user.email) storeEmails.add(m.user.email);
  }

  const storeHtml = emailShell(
    "Novo pedido pago",
    `
      <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
        Você recebeu um novo pedido pago na rede Doctor8.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Paciente:</strong> ${patientName}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Total:</strong> ${total}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Modalidade:</strong> ${fulfillment}</p>
        <p style="margin:0;font-size:14px;color:#334155;"><strong>Itens:</strong> ${itemList}</p>
      </div>
      <p style="text-align:center;margin:0;">
        <a href="${ordersUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
          Ver pedidos
        </a>
      </p>
      ${validateUrl ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b;text-align:center;">Validar receita: <a href="${validateUrl}">${validateUrl}</a></p>` : ""}
    `,
    "pt",
  );

  await Promise.all([
    ...[...storeEmails].map((email) =>
      sendTransactionalEmail({
        to: email,
        subject: `Novo pedido pago — ${order.pharmacyStore.nomeFantasia}`,
        html: storeHtml,
        tag: "pharmacy_order_paid_store",
      }).catch((e) => console.error("[PHARMACY ORDER EMAIL STORE]", e)),
    ),
    ...order.pharmacyStore.members.map((m) =>
      createNotification({
        userId: m.user.id,
        title: "Novo pedido pago",
        body: `${patientName} — ${total} · ${fulfillment}`,
        type: "payment",
        data: { url: "/farmacias/pedidos", orderId: order.id },
      }).catch((e) => console.error("[PHARMACY ORDER NOTIFY STORE]", e)),
    ),
    sendPharmacyOrderPaidStoreWhatsApp({
      toPhone: order.pharmacyStore.contactPhone ?? "",
      storeName: order.pharmacyStore.nomeFantasia,
      patientName,
      totalFormatted: total,
      fulfillmentLabel: fulfillment,
      ordersUrl,
    }).catch((e) => console.error("[PHARMACY ORDER WHATSAPP]", e)),
  ]);

  // ── Paciente: e-mail + in-app ──
  const patientUser = await db.user.findUnique({
    where: { id: order.patientUserId },
    select: { email: true },
  });
  if (!patientUser?.email) return;

  const patientHtml = emailShell(
    "Pedido confirmado",
    `
      <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
        Seu pedido na <strong>${order.pharmacyStore.nomeFantasia}</strong> foi confirmado.
      </p>
      <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Total:</strong> ${total}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Modalidade:</strong> ${fulfillment}</p>
        <p style="margin:0;font-size:14px;color:#334155;"><strong>Itens:</strong> ${itemList}</p>
      </div>
      <p style="text-align:center;margin:0 0 12px;">
        <a href="${patientOrdersUrl}" style="display:inline-block;background:#0a4d6e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
          Acompanhar pedido
        </a>
      </p>
      ${validateUrl ? `<p style="margin:0;font-size:12px;color:#64748b;text-align:center;">Apresente o QR da receita na farmácia ou acesse: <a href="${validateUrl}">validar receita</a></p>` : ""}
    `,
    "pt",
  );

  await Promise.all([
    sendTransactionalEmail({
      to: patientUser.email,
      subject: `Pedido confirmado — ${order.pharmacyStore.nomeFantasia}`,
      html: patientHtml,
      tag: "pharmacy_order_paid_patient",
    }).catch((e) => console.error("[PHARMACY ORDER EMAIL PATIENT]", e)),
    createNotification({
      userId: order.patientUserId,
      title: "Pedido de farmácia confirmado",
      body: `${order.pharmacyStore.nomeFantasia} — ${total}`,
      type: "payment",
      data: { url: "/patient/pharmacy/orders", orderId: order.id },
    }).catch((e) => console.error("[PHARMACY ORDER NOTIFY PATIENT]", e)),
  ]);
}

const STATUS_PATIENT_COPY: Record<
  string,
  { title: string; body: string; emailSubject: string; emailLead: string }
> = {
  CONFIRMED: {
    title: "Pedido confirmado pela farmácia",
    body: "A farmácia confirmou seu pedido e iniciará a preparação.",
    emailSubject: "Farmácia confirmou seu pedido",
    emailLead: "Sua farmácia confirmou o pedido e começará a preparação.",
  },
  PREPARING: {
    title: "Pedido em preparação",
    body: "Seus medicamentos estão sendo separados na farmácia.",
    emailSubject: "Seu pedido está sendo preparado",
    emailLead: "A farmácia está separando seus medicamentos.",
  },
  READY: {
    title: "Pedido pronto",
    body: "Seu pedido está pronto para retirada ou entrega.",
    emailSubject: "Seu pedido está pronto",
    emailLead: "Seu pedido está pronto. Apresente o QR da receita na farmácia.",
  },
  COMPLETED: {
    title: "Pedido concluído",
    body: "Dispensação registrada. Obrigado por usar a rede Doctor8.",
    emailSubject: "Pedido concluído",
    emailLead: "Sua dispensação foi registrada com sucesso.",
  },
  CANCELLED: {
    title: "Pedido cancelado",
    body: "A farmácia cancelou este pedido. Entre em contato se tiver dúvidas.",
    emailSubject: "Pedido cancelado",
    emailLead: "Este pedido foi cancelado pela farmácia.",
  },
};

export async function notifyPharmacyOrderStatusChanged(
  orderId: string,
  newStatus: string,
  opts?: { refundInitiated?: boolean },
): Promise<void> {
  const copy = STATUS_PATIENT_COPY[newStatus];
  if (!copy) return;

  const order = await db.pharmacyOrder.findUnique({
    where: { id: orderId },
    include: {
      pharmacyStore: { select: { nomeFantasia: true } },
      items: { select: { drugName: true } },
    },
  });
  if (!order) return;

  const patientUser = await db.user.findUnique({
    where: { id: order.patientUserId },
    select: { email: true },
  });
  if (!patientUser?.email) return;

  const appUrl = getAppUrl();
  const patientOrdersUrl = `${appUrl}/patient/pharmacy/orders`;
  const total = formatBrl(order.totalCents);
  const itemList = order.items.map((i) => i.drugName).join(", ");
  const refundNote =
    newStatus === "CANCELLED" && opts?.refundInitiated
      ? "<p style=\"margin:12px 0 0;font-size:14px;color:#334155;\">O reembolso foi iniciado automaticamente e deve aparecer no seu meio de pagamento em alguns dias úteis.</p>"
      : "";

  const html = emailShell(
    copy.emailSubject,
    `
      <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">${copy.emailLead}</p>
      ${refundNote}
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Farmácia:</strong> ${order.pharmacyStore.nomeFantasia}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Total:</strong> ${total}</p>
        <p style="margin:0;font-size:14px;color:#334155;"><strong>Itens:</strong> ${itemList}</p>
      </div>
      <p style="text-align:center;margin:0;">
        <a href="${patientOrdersUrl}" style="display:inline-block;background:#0a4d6e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
          Ver pedido
        </a>
      </p>
    `,
    "pt",
  );

  const notifyBody =
    newStatus === "CANCELLED" && opts?.refundInitiated
      ? `${order.pharmacyStore.nomeFantasia} — ${copy.body} Reembolso iniciado.`
      : `${order.pharmacyStore.nomeFantasia} — ${copy.body}`;

  await Promise.all([
    sendTransactionalEmail({
      to: patientUser.email,
      subject: `${copy.emailSubject} — ${order.pharmacyStore.nomeFantasia}`,
      html,
      tag: `pharmacy_order_${newStatus.toLowerCase()}_patient`,
    }).catch((e) => console.error("[PHARMACY ORDER STATUS EMAIL]", e)),
    createNotification({
      userId: order.patientUserId,
      title: copy.title,
      body: notifyBody,
      type: "system",
      data: { url: "/patient/pharmacy/orders", orderId: order.id },
    }).catch((e) => console.error("[PHARMACY ORDER STATUS NOTIFY]", e)),
  ]);
}
