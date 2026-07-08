import { db } from "@/lib/db";

/** Seed partner clinics if directory is empty (idempotent). */
export async function ensureDefaultClinicPartners(): Promise<void> {
  const count = await db.occupationalClinicPartner.count();
  if (count > 0) return;

  await db.occupationalClinicPartner.createMany({
    data: [
      {
        name: "Clínica Ocupacional São Paulo Centro",
        cnpj: "12345678000190",
        city: "São Paulo",
        state: "SP",
        email: "agendamento@clinica-sp.exemplo",
        phone: "(11) 3000-0000",
        addressLine: "Av. Paulista, 1000 — Bela Vista",
        servicesJson: ["ADMISSIONAL", "PERIODICO", "DEMISSIONAL", "RETORNO_TRABALHO"],
      },
      {
        name: "Medicina do Trabalho Curitiba",
        cnpj: "98765432000110",
        city: "Curitiba",
        state: "PR",
        email: "contato@mt-curitiba.exemplo",
        phone: "(41) 3000-0000",
        addressLine: "Rua XV de Novembro, 500 — Centro",
        servicesJson: ["ADMISSIONAL", "PERIODICO", "MUDANCA_FUNCAO"],
      },
      {
        name: "Rede SST Rio de Janeiro",
        cnpj: "11223344000155",
        city: "Rio de Janeiro",
        state: "RJ",
        email: "sst@rede-rj.exemplo",
        phone: "(21) 3000-0000",
        addressLine: "Av. Rio Branco, 200 — Centro",
        servicesJson: ["PERIODICO", "RETORNO_TRABALHO", "DEMISSIONAL"],
      },
    ],
  });
}

export async function listActiveClinics(state?: string) {
  await ensureDefaultClinicPartners();
  return db.occupationalClinicPartner.findMany({
    where: {
      active: true,
      ...(state ? { state } : {}),
    },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
  });
}

export function clinicSupportsExamType(
  servicesJson: unknown,
  examType: string,
): boolean {
  if (!Array.isArray(servicesJson)) return true;
  return servicesJson.includes(examType);
}
