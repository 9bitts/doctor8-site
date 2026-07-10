import { db } from "@/lib/db";

export async function requireVerifiedProfessional(
  userId: string,
): Promise<{ ok: true; professionalId: string } | { ok: false; error: string; status: number }> {
  const pro = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true, verified: true, licenseNumber: true },
  });

  if (!pro) {
    return { ok: false, error: "Perfil profissional não encontrado.", status: 404 };
  }

  if (!pro.verified) {
    return {
      ok: false,
      error:
        "Seu registro profissional (CRM/conselho) ainda não foi verificado. Envie a documentação nas configurações da conta.",
      status: 403,
    };
  }

  if (!pro.licenseNumber?.trim()) {
    return {
      ok: false,
      error: "Informe seu número de registro profissional (CRM/conselho) antes de realizar atendimentos.",
      status: 403,
    };
  }

  return { ok: true, professionalId: pro.id };
}
