import { sncrEnabled } from "@/lib/sncr/config";
import { SncrApiError, sncrFetch } from "@/lib/sncr/client";

export type SncrBaixaResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; baixaId?: string }
  | { ok: false; error: string };

export type RegisterSncrDispenseInput = {
  accessToken?: string | null;
  sncrReceiptNumber: string;
  sncrReceiptType: string;
  pharmacyCnpj: string;
  prescriptionId: string;
  dispensedAt: Date;
};

/**
 * Register SNCR baixa (national dispense) for Lista B/C prescriptions.
 * Skips when SNCR is disabled or number is DEV placeholder.
 */
export async function registerSncrDispense(
  input: RegisterSncrDispenseInput,
): Promise<SncrBaixaResult> {
  const number = input.sncrReceiptNumber.trim();
  if (!number || number.startsWith("DEV-")) {
    return { ok: true, skipped: true, reason: "dev_or_missing_number" };
  }
  if (!sncrEnabled()) {
    return { ok: true, skipped: true, reason: "sncr_disabled" };
  }
  if (!input.accessToken) {
    return { ok: true, skipped: true, reason: "pharmacy_auth_pending" };
  }

  const cnpj = input.pharmacyCnpj.replace(/\D/g, "");
  if (!cnpj) {
    return { ok: false, error: "CNPJ da farmácia não configurado" };
  }

  try {
    const res = await sncrFetch("/dispensacoes/baixa", input.accessToken, {
      method: "POST",
      body: JSON.stringify({
        numeroReceita: number,
        tipoReceita: input.sncrReceiptType,
        cnpjFarmacia: cnpj,
        dataDispensacao: input.dispensedAt.toISOString(),
        referenciaExterna: input.prescriptionId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof (data as { message?: string }).message === "string"
          ? (data as { message: string }).message
          : "Falha ao registrar baixa SNCR";
      return { ok: false, error: msg };
    }
    const baixaId =
      (data as { id?: string }).id ||
      (data as { baixaId?: string }).baixaId ||
      undefined;
    return { ok: true, skipped: false, baixaId };
  } catch (e) {
    if (e instanceof SncrApiError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "Erro de comunicação com SNCR" };
  }
}
