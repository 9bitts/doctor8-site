import { db } from "@/lib/db";
import type { ImportOrderStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { IMPORT_STATUS_LABEL } from "@/lib/import-order";

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function opsInbox(): string | null {
  return process.env.IMPORT_OPS_EMAIL || process.env.SUPPORT_EMAIL || process.env.EMAIL_REPLY_TO || null;
}

async function loadOrder(orderId: string) {
  return db.importOrder.findUnique({
    where: { id: orderId },
    include: {
      product: { select: { name: true, strengthMg: true } },
      patientUser: { select: { id: true, email: true } },
      distributor: {
        select: {
          tradeName: true,
          brandAlias: true,
          members: {
            where: { status: "ACTIVE" },
            select: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });
}

export async function notifyImportOrderTransition(
  orderId: string,
  fromStatus: ImportOrderStatus | null,
  toStatus: ImportOrderStatus,
): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order) return;

  const appUrl = getAppUrl();
  const patientUrl = `${appUrl}/patient/importacao/${order.id}`;
  const adminUrl = `${appUrl}/admin/importacoes`;
  const distUrl = `${appUrl}/distribuidores/pedidos`;
  const productLabel = `${order.product.name} × ${order.quantity}`;
  const fee = formatBrl(order.feeBrlCents);
  const productUsd = formatUsd(order.productUsdCents * order.quantity + order.shippingUsdCents);
  const statusLabel = IMPORT_STATUS_LABEL[toStatus] || toStatus;

  if (toStatus === "DOCUMENTS_SUBMITTED" && order.patientUser.email) {
    const html = emailShell(
      "Solicitação de importação recebida",
      `
        <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
          Recebemos sua solicitação de importação Zephra.
        </p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Produto:</strong> ${productLabel}</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>Status:</strong> Documentos enviados — em análise</p>
        </div>
        <p style="text-align:center;margin:0;">
          <a href="${patientUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
            Acompanhar pedido
          </a>
        </p>
      `,
      "pt",
    );
    await sendTransactionalEmail({
      to: order.patientUser.email,
      subject: "Importação Zephra — solicitação recebida",
      html,
      tag: "import_order_submitted_patient",
    }).catch((e) => console.error("[IMPORT EMAIL]", e));

    const ops = opsInbox();
    if (ops) {
      await sendTransactionalEmail({
        to: ops,
        subject: `Nova importação D2C — ${productLabel}`,
        html: emailShell(
          "Nova solicitação de importação",
          `<p>${productLabel}</p><p>Paciente: ${order.patientUser.email}</p><p><a href="${adminUrl}">Abrir painel</a></p>`,
          "pt",
        ),
        tag: "import_order_submitted_ops",
      }).catch((e) => console.error("[IMPORT EMAIL OPS]", e));
    }
  }

  if (
    (toStatus === "DOCUMENTS_NEEDS_FIX" ||
      toStatus === "DOCUMENTS_APPROVED" ||
      toStatus === "ANVISA_REJECTED" ||
      toStatus === "ANVISA_PENDING") &&
    order.patientUser.email
  ) {
    const messages: Record<string, string> = {
      DOCUMENTS_NEEDS_FIX: "Precisamos que você corrija ou reenvie documentos do pedido.",
      DOCUMENTS_APPROVED: "Seus documentos foram aprovados. Seguiremos com a autorização Anvisa.",
      ANVISA_PENDING: "Seu pedido entrou na fila de autorização Anvisa.",
      ANVISA_REJECTED: `A autorização Anvisa foi negada${order.anvisaRejectReason ? `: ${order.anvisaRejectReason}` : "."}`,
    };
    const html = emailShell(
      `Importação — ${statusLabel}`,
      `
        <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">${messages[toStatus]}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;"><strong>${productLabel}</strong></p>
        <p style="text-align:center;margin:0;">
          <a href="${patientUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
            Ver pedido
          </a>
        </p>
      `,
      "pt",
    );
    await sendTransactionalEmail({
      to: order.patientUser.email,
      subject: `Importação Zephra — ${statusLabel}`,
      html,
      tag: `import_order_${toStatus.toLowerCase()}`,
    }).catch((e) => console.error("[IMPORT EMAIL]", e));
    await createNotification({
      userId: order.patientUser.id,
      title: "Importação Zephra",
      body: messages[toStatus] || statusLabel,
      type: "system",
      data: { url: `/patient/importacao/${order.id}`, orderId: order.id },
    }).catch((e) => console.error("[IMPORT NOTIFY]", e));
  }

  if (toStatus === "PAYMENT_PENDING" && order.patientUser.email) {
    const html = emailShell(
      "Anvisa autorizada — pague a taxa Doctor8",
      `
        <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
          Sua autorização Anvisa foi registrada. Pague agora a taxa Doctor8 (${order.feePercent}%) para liberar o fulfillment.
        </p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Produto + frete (Zephra):</strong> ${productUsd}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Taxa Doctor8:</strong> ${fee}</p>
          <p style="margin:0;font-size:13px;color:#64748b;">O valor do produto em USD é cobrado/acordado à parte com o fornecedor.</p>
        </div>
        <p style="text-align:center;margin:0;">
          <a href="${patientUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
            Pagar taxa Doctor8
          </a>
        </p>
      `,
      "pt",
    );
    await sendTransactionalEmail({
      to: order.patientUser.email,
      subject: `Importação Zephra — pague a taxa (${fee})`,
      html,
      tag: "import_order_payment_pending",
    }).catch((e) => console.error("[IMPORT EMAIL]", e));
    await createNotification({
      userId: order.patientUser.id,
      title: "Pagar taxa de importação",
      body: `Anvisa autorizada. Taxa Doctor8: ${fee}`,
      type: "payment",
      data: { url: `/patient/importacao/${order.id}`, orderId: order.id },
    }).catch((e) => console.error("[IMPORT NOTIFY]", e));
  }

  if (toStatus === "PAID") {
    if (order.patientUser.email) {
      await sendTransactionalEmail({
        to: order.patientUser.email,
        subject: "Importação Zephra — taxa confirmada",
        html: emailShell(
          "Pagamento confirmado",
          `
            <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
              Recebemos a taxa Doctor8 (${fee}). Em breve o pedido seguirá para envio.
            </p>
            <p style="text-align:center;margin:0;">
              <a href="${patientUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
                Acompanhar
              </a>
            </p>
          `,
          "pt",
        ),
        tag: "import_order_paid_patient",
      }).catch((e) => console.error("[IMPORT EMAIL]", e));
      await createNotification({
        userId: order.patientUser.id,
        title: "Taxa de importação paga",
        body: `${productLabel} — ${fee}`,
        type: "payment",
        data: { url: `/patient/importacao/${order.id}`, orderId: order.id },
      }).catch((e) => console.error("[IMPORT NOTIFY]", e));
    }

    const distEmails = new Set<string>();
    const distMembers = order.distributor?.members ?? [];
    for (const m of distMembers) {
      if (m.user.email) distEmails.add(m.user.email);
      await createNotification({
        userId: m.user.id,
        title: "Pedido importação pago",
        body: `${productLabel} — aguardando liberação/envio`,
        type: "payment",
        data: { url: "/distribuidores/pedidos", orderId: order.id },
      }).catch((e) => console.error("[IMPORT NOTIFY DIST]", e));
    }
    const distHtml = emailShell(
      "Pedido D2C pago",
      `
        <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">
          Um pedido Zephra teve a taxa Doctor8 confirmada.
        </p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Produto:</strong> ${productLabel}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Destino:</strong> ${order.shipCity}/${order.shipState}</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>Anvisa:</strong> ${order.anvisaAuthorizationNumber || "—"}</p>
        </div>
        <p style="text-align:center;margin:0;">
          <a href="${distUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
            Ver pedidos
          </a>
        </p>
      `,
      "pt",
    );
    await Promise.all(
      [...distEmails].map((email) =>
        sendTransactionalEmail({
          to: email,
          subject: `Pedido pago — ${productLabel}`,
          html: distHtml,
          tag: "import_order_paid_distributor",
        }).catch((e) => console.error("[IMPORT EMAIL DIST]", e)),
      ),
    );
  }

  if ((toStatus === "SHIPPED" || toStatus === "DELIVERED") && order.patientUser.email) {
    const shippedMsg =
      toStatus === "SHIPPED"
        ? `Seu pedido foi enviado${order.trackingNumber ? ` · ${order.courierName || "Courier"} ${order.trackingNumber}` : "."}`
        : "Seu pedido foi marcado como entregue.";
    await sendTransactionalEmail({
      to: order.patientUser.email,
      subject: `Importação Zephra — ${toStatus === "SHIPPED" ? "enviado" : "entregue"}`,
      html: emailShell(
        toStatus === "SHIPPED" ? "Pedido enviado" : "Pedido entregue",
        `
          <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">${shippedMsg}</p>
          <p style="text-align:center;margin:0;">
            <a href="${patientUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
              Ver pedido
            </a>
          </p>
        `,
        "pt",
      ),
      tag: `import_order_${toStatus.toLowerCase()}`,
    }).catch((e) => console.error("[IMPORT EMAIL]", e));
    await createNotification({
      userId: order.patientUser.id,
      title: toStatus === "SHIPPED" ? "Pedido enviado" : "Pedido entregue",
      body: shippedMsg,
      type: "system",
      data: { url: `/patient/importacao/${order.id}`, orderId: order.id },
    }).catch((e) => console.error("[IMPORT NOTIFY]", e));
  }

  void fromStatus;
}
