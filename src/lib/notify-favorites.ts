// Notify patients who favorited a professional when they go online (JIT).

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
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
    favorites.map((fav) => {
      const copy = storedNotificationText(
        "notif.favoriteOnline.title",
        "notif.favoriteOnline.body",
        { name, specialty: pro.specialty },
      );
      return createNotification({
        userId: fav.patientUserId,
        title: copy.title,
        body: copy.body,
        type: "system",
        data: {
          kind: "favorite_online",
          professionalId,
          link: `/patient/find?pro=${professionalId}`,
          titleKey: "notif.favoriteOnline.title",
          bodyKey: "notif.favoriteOnline.body",
          bodyParams: { name, specialty: pro.specialty },
        },
      });
    })
  );
}
