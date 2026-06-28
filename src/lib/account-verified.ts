// Account activation — email link and/or SMS code.

import type { User } from "@prisma/client";

export function isAccountVerified(
  user: Pick<User, "emailVerified" | "phoneVerified">,
): boolean {
  return Boolean(user.emailVerified || user.phoneVerified);
}
