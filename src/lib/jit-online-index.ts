import { db } from "@/lib/db";
import { activeOnlineJitSessionWhere } from "@/lib/jit-session-lifecycle";

/** Single query: online JIT sessions keyed by professional profile id. */
export async function getOnlineJitSessionByProfessionalId(): Promise<Map<string, string>> {
  const sessions = await db.jitSession.findMany({
    where: activeOnlineJitSessionWhere(),
    select: { id: true, professionalId: true },
  });
  return new Map(sessions.map((s) => [s.professionalId, s.id]));
}
