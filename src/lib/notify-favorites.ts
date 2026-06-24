// Notify patients who favorited a professional when they go online (JIT).

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getProfessionInfo } from "@/lib/profession-label";

export async function notifyFavoritePatientsOnline(professionalId: string): Promise<void> {
  const pro = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { firstName: true, lastName: true, specialty: true },
  });
  if (!pro) return;

  const favorites = await db.patientFavorite.findMany({
    where: { professionalId, notifyOnline: true },
    select: { patientUserId: true },
  });
  if (!favorites.length) return;

  const profInfo = getProfessionInfo(pro.specialty);
  const prefix = profInfo.typeKey === "psychologist" ? "Psic." : profInfo.typeKey === "nutritionist" ? "Nutr." : "Dr.";
  const name = `${prefix} ${pro.firstName} ${pro.lastName}`;

  await Promise.all(
    favorites.map((fav) =>
      createNotification({
        userId: fav.patientUserId,
        title: `${name} está online`,
        body: `Seu profissional favorito está disponível para atendimento imediato em ${pro.specialty}.`,
        type: "system",
        data: {
          kind: "favorite_online",
          professionalId,
          link: `/patient/find?pro=${professionalId}`,
          titleKey: "notif.favoriteOnline.title",
          bodyKey: "notif.favoriteOnline.body",
          bodyParams: { name, specialty: pro.specialty },
        },
      })
    )
  );
}
