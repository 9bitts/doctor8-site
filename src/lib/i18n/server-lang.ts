// Server-side language resolution — matches client I18nProvider (cookie + DB).

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Lang, normalizeLang } from "./translations";

const STORAGE_KEY = "doctor8.lang";

export async function getUserLang(userId: string): Promise<Lang> {
  const cookieLang = cookies().get(STORAGE_KEY)?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { language: true },
  });
  return normalizeLang(user?.language);
}
