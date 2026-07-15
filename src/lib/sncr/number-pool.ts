import { db } from "@/lib/db";
import {
  requestNotificacaoReceitaNumbers,
  requestReceitaEspecialNumbers,
  getSncrAccessToken,
  councilFromSpecialty,
  type NotificacaoReceitaType,
} from "@/lib/sncr/client";
import {
  sncrEnabled,
  sncrMinBatchSize,
  sncrPlatformCnpj,
} from "@/lib/sncr/config";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

function receiptTypeForFormKind(formKind: PrescriptionFormKind): string | null {
  if (formKind === "NRB") return "NRB";
  if (formKind === "RCE") return "RCE";
  return null;
}

function devNumber(formKind: PrescriptionFormKind, uf: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const prefix = formKind === "NRB" ? "NRB" : "RCE";
  return `DEV-${uf}-${prefix}-${ts}`;
}

async function readPool(professionalId: string, receiptType: string): Promise<string[]> {
  const row = await db.sncrNumberPool.findUnique({
    where: { professionalId_receiptType: { professionalId, receiptType } },
  });
  if (!row) return [];
  const nums = row.numbers;
  return Array.isArray(nums) ? (nums as string[]) : [];
}

async function writePool(
  professionalId: string,
  receiptType: string,
  numbers: string[],
): Promise<void> {
  await db.sncrNumberPool.upsert({
    where: { professionalId_receiptType: { professionalId, receiptType } },
    create: { professionalId, receiptType, numbers },
    update: { numbers, updatedAt: new Date() },
  });
}

async function replenishPool(opts: {
  professionalId: string;
  formKind: PrescriptionFormKind;
  licenseNumber: string;
  licenseState: string;
  specialty: string;
  accessToken: string | null;
}): Promise<string[]> {
  const receiptType = receiptTypeForFormKind(opts.formKind);
  if (!receiptType) return [];

  const uf = (opts.licenseState || "SP").toUpperCase().slice(0, 2);
  const conselho = councilFromSpecialty(opts.specialty);
  const documento = opts.licenseNumber.replace(/\D/g, "") || opts.licenseNumber;

  if (!sncrEnabled() || !opts.accessToken) {
    const batch = Array.from({ length: sncrMinBatchSize() }, () =>
      devNumber(opts.formKind, uf),
    );
    const existing = await readPool(opts.professionalId, receiptType);
    const merged = [...existing, ...batch];
    await writePool(opts.professionalId, receiptType, merged);
    return merged;
  }

  if (opts.formKind === "NRB") {
    const res = await requestNotificacaoReceitaNumbers({
      accessToken: opts.accessToken,
      receita: receiptType as NotificacaoReceitaType,
      conselho,
      uf,
      documento,
      quantidade: sncrMinBatchSize(),
    });
    if (res.numbers.length === 0) return [];
    const existing = await readPool(opts.professionalId, receiptType);
    const merged = [...existing, ...res.numbers];
    await writePool(opts.professionalId, receiptType, merged);
    return merged;
  }

  const cnpj = sncrPlatformCnpj();
  if (!cnpj) {
    throw new Error("SNCR_PLATFORM_CNPJ não configurado para Receita de Controle Especial");
  }
  const res = await requestReceitaEspecialNumbers({
    accessToken: opts.accessToken,
    tipo: "RCE",
    conselho,
    uf,
    documento,
    cnpj,
  });
  if (res.numbers.length === 0) return [];
  const existing = await readPool(opts.professionalId, receiptType);
  const merged = [...existing, ...res.inicio!].filter(Boolean);
  await writePool(opts.professionalId, receiptType, merged);
  return merged;
}

/** Reserve one SNCR number for a controlled prescription. */
export async function reserveSncrReceiptNumber(opts: {
  professionalId: string;
  formKind: PrescriptionFormKind;
  licenseNumber: string;
  licenseState: string;
  specialty: string;
}): Promise<{ number: string; receiptType: string; devMode: boolean }> {
  const receiptType = receiptTypeForFormKind(opts.formKind);
  if (!receiptType) {
    throw new Error("Tipo de receituário não exige numeração SNCR");
  }

  let pool = await readPool(opts.professionalId, receiptType);
  if (pool.length === 0) {
    const accessToken = await getSncrAccessToken(opts.professionalId);
    pool = await replenishPool({ ...opts, accessToken });
  }

  if (pool.length === 0) {
    throw new Error(
      "Sem numeração SNCR disponível. Autentique-se com Gov.br e confirme cadastro na Vigilância Sanitária.",
    );
  }

  const [number, ...rest] = pool;
  await writePool(opts.professionalId, receiptType, rest);

  const devMode = number.startsWith("DEV-") || !sncrEnabled();
  return { number, receiptType, devMode };
}

export async function sncrPoolBalance(
  professionalId: string,
  formKind: PrescriptionFormKind,
): Promise<number> {
  const receiptType = receiptTypeForFormKind(formKind);
  if (!receiptType) return 0;
  return (await readPool(professionalId, receiptType)).length;
}
