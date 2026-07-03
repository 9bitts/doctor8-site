var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma, db;
var init_db = __esm({
  "src/lib/db.ts"() {
    "use strict";
    globalForPrisma = globalThis;
    db = globalForPrisma.prisma ?? new PrismaClient({
      log: true ? ["query", "error", "warn"] : ["error"]
    });
    globalForPrisma.prisma = db;
  }
});

// src/lib/oauth-signup-intent.ts
var oauth_signup_intent_exports = {};
__export(oauth_signup_intent_exports, {
  OAUTH_SIGNUP_ROLE_COOKIE: () => OAUTH_SIGNUP_ROLE_COOKIE,
  OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS: () => OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS,
  createSignupRoleToken: () => createSignupRoleToken,
  parseSignupRoleToken: () => parseSignupRoleToken
});
import { createHmac, timingSafeEqual } from "crypto";
function signingSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return secret;
}
function signPayload(payload) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}
function createSignupRoleToken(role, professionalKind = null, phoneE164 = null) {
  const exp = Math.floor(Date.now() / 1e3) + OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS;
  const kind = professionalKind ?? "";
  const phone = (phoneE164 || "").replace(/\D/g, "");
  const payload = `${role}:${kind}:${phone}:${exp}`;
  return `${payload}.${signPayload(payload)}`;
}
function parseSignupRoleToken(token) {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = signPayload(payload);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }
  const parts = payload.split(":");
  if (parts.length < 2) return null;
  let role;
  let kind;
  let phone;
  let expStr;
  if (parts.length === 4) {
    [role, kind, phone, expStr] = parts;
  } else if (parts.length === 3) {
    [role, kind, expStr] = parts;
    phone = "";
  } else if (parts.length === 2) {
    [role, expStr] = parts;
    kind = "";
    phone = "";
  } else {
    return null;
  }
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1e3)) return null;
  if (!VALID_ROLES.has(role)) return null;
  if (!VALID_KINDS.has(kind)) return null;
  return {
    role,
    professionalKind: kind === "psychologist" ? "psychologist" : null,
    phoneE164: phone || null
  };
}
var OAUTH_SIGNUP_ROLE_COOKIE, OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS, VALID_ROLES, VALID_KINDS;
var init_oauth_signup_intent = __esm({
  "src/lib/oauth-signup-intent.ts"() {
    "use strict";
    OAUTH_SIGNUP_ROLE_COOKIE = "oauth_signup_role";
    OAUTH_SIGNUP_ROLE_MAX_AGE_SECONDS = 600;
    VALID_ROLES = /* @__PURE__ */ new Set([
      "PATIENT",
      "PROFESSIONAL",
      "PSYCHOANALYST",
      "INTEGRATIVE_THERAPIST"
    ]);
    VALID_KINDS = /* @__PURE__ */ new Set(["", "psychologist"]);
  }
});

// src/lib/jit-session-lifecycle.ts
var jit_session_lifecycle_exports = {};
__export(jit_session_lifecycle_exports, {
  activeOnlineJitSessionWhere: () => activeOnlineJitSessionWhere,
  closeJitSessionsForUser: () => closeJitSessionsForUser,
  expireStaleJitSessions: () => expireStaleJitSessions,
  getJitHeartbeatCutoff: () => getJitHeartbeatCutoff,
  getJitHeartbeatTimeoutSeconds: () => getJitHeartbeatTimeoutSeconds,
  touchJitHeartbeat: () => touchJitHeartbeat
});
function getJitHeartbeatTimeoutSeconds() {
  return parseInt(process.env.JIT_HEARTBEAT_TIMEOUT_SECONDS || String(DEFAULT_HEARTBEAT_SECONDS), 10);
}
function getJitHeartbeatCutoff() {
  return new Date(Date.now() - getJitHeartbeatTimeoutSeconds() * 1e3);
}
function activeOnlineJitSessionWhere() {
  const cutoff = getJitHeartbeatCutoff();
  return {
    status: "ONLINE",
    OR: [
      { lastHeartbeatAt: { gte: cutoff } },
      { lastHeartbeatAt: null, updatedAt: { gte: cutoff } }
    ]
  };
}
async function closeJitSessionsForUser(userId) {
  const professional = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!professional) return 0;
  const result = await db.jitSession.updateMany({
    where: { professionalId: professional.id, status: { in: ["ONLINE", "PAUSED"] } },
    data: { status: "OFFLINE" }
  });
  return result.count;
}
async function touchJitHeartbeat(professionalId) {
  const now = /* @__PURE__ */ new Date();
  const result = await db.jitSession.updateMany({
    where: { professionalId, status: { in: ["ONLINE", "PAUSED"] } },
    data: { lastHeartbeatAt: now }
  });
  return result.count > 0;
}
async function expireStaleJitSessions() {
  const cutoff = getJitHeartbeatCutoff();
  const result = await db.jitSession.updateMany({
    where: {
      status: { in: ["ONLINE", "PAUSED"] },
      OR: [
        { lastHeartbeatAt: { lt: cutoff } },
        { lastHeartbeatAt: null, updatedAt: { lt: cutoff } }
      ]
    },
    data: { status: "OFFLINE" }
  });
  return result.count;
}
var DEFAULT_HEARTBEAT_SECONDS;
var init_jit_session_lifecycle = __esm({
  "src/lib/jit-session-lifecycle.ts"() {
    "use strict";
    init_db();
    DEFAULT_HEARTBEAT_SECONDS = 900;
  }
});

// src/app/api/admin/rateio/route.ts
import { NextResponse } from "next/server";

// src/lib/auth.ts
init_db();
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// src/lib/audit.ts
init_db();
import { AuditAction } from "@prisma/client";
import { headers } from "next/headers";
async function createAuditLog(params2) {
  try {
    const headersList = headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";
    await db.auditLog.create({
      data: {
        userId: params2.userId,
        action: params2.action,
        resource: params2.resource,
        resourceId: params2.resourceId,
        ipAddress: ipAddress.split(",")[0].trim(),
        // first IP if behind proxy
        userAgent: userAgent.substring(0, 500),
        // truncate long agents
        details: params2.details
      }
    });
  } catch (error) {
    console.error("[AUDIT LOG FAILURE]", error);
  }
}
var audit = {
  viewRecord: (userId, resource, resourceId) => createAuditLog({ userId, action: AuditAction.VIEW_RECORD, resource, resourceId }),
  createRecord: (userId, resource, resourceId) => createAuditLog({ userId, action: AuditAction.CREATE_RECORD, resource, resourceId }),
  updateRecord: (userId, resource, resourceId) => createAuditLog({ userId, action: AuditAction.UPDATE_RECORD, resource, resourceId }),
  deleteRecord: (userId, resource, resourceId) => createAuditLog({ userId, action: AuditAction.DELETE_RECORD, resource, resourceId }),
  shareRecord: (userId, resourceId, details) => createAuditLog({ userId, action: AuditAction.SHARE_RECORD, resource: "MedicalDocument", resourceId, details }),
  exportData: (userId) => createAuditLog({ userId, action: AuditAction.EXPORT_DATA, resource: "User" }),
  login: (userId) => createAuditLog({ userId, action: AuditAction.LOGIN, resource: "Session" }),
  logout: (userId) => createAuditLog({ userId, action: AuditAction.LOGOUT, resource: "Session" }),
  passwordChange: (userId) => createAuditLog({ userId, action: AuditAction.PASSWORD_CHANGE, resource: "User" }),
  emailChange: (userId) => createAuditLog({ userId, action: AuditAction.EMAIL_CHANGE, resource: "User" }),
  deletionRequest: (userId) => createAuditLog({
    userId,
    action: AuditAction.DATA_DELETION_REQUEST,
    resource: "User",
    resourceId: userId
  }),
  accountReactivated: (userId) => createAuditLog({
    userId,
    action: AuditAction.UPDATE_RECORD,
    resource: "User",
    resourceId: userId,
    details: { event: "account_reactivated_on_login" }
  })
};

// src/lib/account-verified.ts
function isAccountVerified(user) {
  return Boolean(user.emailVerified || user.phoneVerified);
}

// src/lib/auth.ts
import bcrypt from "bcryptjs";
import { z } from "zod";

// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
var ALGORITHM = "aes-256-gcm";
function getKey() {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string. Generate with: openssl rand -hex 32");
  }
  return key;
}
function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

// src/lib/user-phone.ts
function encryptUserPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return encrypt(digits);
}

// src/lib/save-registration-phone.ts
async function saveRegistrationPhone(tx, userId, role, e164) {
  if (!e164) return;
  await tx.user.update({
    where: { id: userId },
    data: { phone: encryptUserPhone(e164) }
  });
  const displayPhone = encrypt(`+${e164}`);
  if (role === "PATIENT") {
    await tx.patientProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone }
    });
  } else if (role === "PROFESSIONAL") {
    await tx.professionalProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone }
    });
  } else if (role === "PSYCHOANALYST") {
    await tx.psychoanalystProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone }
    });
  } else if (role === "INTEGRATIVE_THERAPIST") {
    await tx.integrativeTherapistProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone }
    });
  } else if (role === "ANGEL") {
    await tx.angelProfile.updateMany({
      where: { userId },
      data: { phone: displayPhone }
    });
  }
}

// src/lib/account-deletion.ts
init_db();
async function resolveDeletedAccountOnLogin(user) {
  if (!user.deletedAt) {
    return { blocked: false, reactivated: false };
  }
  const now = /* @__PURE__ */ new Date();
  const stillInGracePeriod = user.deletionScheduledAt !== null && user.deletionScheduledAt > now;
  if (stillInGracePeriod) {
    await db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        deletionScheduledAt: null
      }
    });
    await audit.accountReactivated(user.id);
    return { blocked: false, reactivated: true };
  }
  return { blocked: true, reactivated: false };
}

// src/lib/signup-profile-create.ts
async function createSignupProfile(tx, opts) {
  const { userId, role, professionalKind, firstName, lastName, avatarUrl } = opts;
  if (role === "PROFESSIONAL") {
    await tx.professionalProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        licenseNumber: "",
        specialty: professionalKind === "psychologist" ? "Psychologist" : "",
        consultPrice: 0
      }
    });
  } else if (role === "PSYCHOANALYST") {
    await tx.psychoanalystProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        trainingInstitution: "",
        consultPrice: 0
      }
    });
  } else if (role === "INTEGRATIVE_THERAPIST") {
    await tx.integrativeTherapistProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
        trainingInstitution: "",
        consultPrice: 0
      }
    });
  } else {
    await tx.patientProfile.create({
      data: {
        userId,
        firstName: encrypt(firstName),
        lastName: encrypt(lastName),
        avatarUrl: avatarUrl ?? null
      }
    });
  }
}

// src/lib/user-profile-complete.ts
var PROFILE_EXEMPT_ROLES = /* @__PURE__ */ new Set(["ADMIN", "ANGEL", "ORGANIZATION"]);
function isProfileExemptRole(role) {
  return !!role && PROFILE_EXEMPT_ROLES.has(role);
}
function userHasProfileForRole(user) {
  switch (user.role) {
    case "PATIENT":
      return !!user.patientProfile;
    case "PROFESSIONAL":
      return !!user.professionalProfile;
    case "PSYCHOANALYST":
      return !!user.psychoanalystProfile;
    case "INTEGRATIVE_THERAPIST":
      return !!user.integrativeTherapistProfile;
    default:
      return true;
  }
}
function accountNeedsProfileCompletion(user) {
  if (isProfileExemptRole(user.role)) return false;
  return !userHasProfileForRole(user);
}
function computeProfileComplete(user) {
  return !accountNeedsProfileCompletion(user);
}

// src/lib/user-profile-db.ts
init_db();
var PROFILE_SELECT = {
  role: true,
  patientProfile: { select: { firstName: true } },
  professionalProfile: { select: { firstName: true } },
  psychoanalystProfile: { select: { firstName: true } },
  integrativeTherapistProfile: { select: { firstName: true } }
};
async function fetchUserProfileSnapshot(userId) {
  return db.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT
  });
}

// src/lib/humanitarian/feature-flags.ts
function isHumanitarianEmailVerificationEnabled() {
  const raw = process.env.HUMANITARIAN_EMAIL_VERIFICATION_ENABLED;
  if (raw === void 0 || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}
function canSkipHumanitarianEmailVerification(_callbackUrl, originCookie = false) {
  return originCookie && !isHumanitarianEmailVerificationEnabled();
}

// src/lib/volunteer-attend-guide.ts
function isVolunteerGuideProviderRole(role) {
  return role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST";
}

// src/lib/humanitarian/constants.ts
var VENEZUELA_CAMPAIGN_SLUG = "venezuela-terremoto-2026";

// src/lib/humanitarian/origin-cookie.ts
var HUM_ORIGIN_COOKIE = "doctor8.hum.origin";
var HUM_RETURN_COOKIE = "doctor8.hum.return";
var HUM_ORIGIN_MAX_AGE_SECONDS = 2 * 60 * 60;
var DEFAULT_CAMPAIGN_PATH = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
function defaultHumanitarianReturnPath() {
  return DEFAULT_CAMPAIGN_PATH;
}
async function readServerHumAuthCookies() {
  try {
    const { cookies } = await import("next/headers");
    const jar = cookies();
    const originCookie = jar.get(HUM_ORIGIN_COOKIE)?.value === "1";
    const raw = jar.get(HUM_RETURN_COOKIE)?.value;
    const returnPath = raw?.startsWith("/") ? raw : null;
    return { originCookie, returnPath };
  } catch {
    return { originCookie: false, returnPath: null };
  }
}
function resolveHumanitarianAuthCallback(callbackUrl, sources) {
  if (callbackUrl?.trim()) return callbackUrl.trim();
  if (sources.originCookie && sources.returnPath) return sources.returnPath;
  if (sources.originCookie) return defaultHumanitarianReturnPath();
  return null;
}

// src/lib/auth.ts
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  callbackUrl: z.string().optional()
});
var SESSION_MAX_AGE = parseInt(
  process.env.SESSION_MAX_AGE_SECONDS || "900"
);
var TOKEN_VERSION_CHECK_MS = 6e4;
var isProduction = false;
async function readSignupIntent() {
  try {
    const { cookies } = await import("next/headers");
    const { parseSignupRoleToken: parseSignupRoleToken2, OAUTH_SIGNUP_ROLE_COOKIE: OAUTH_SIGNUP_ROLE_COOKIE2 } = await Promise.resolve().then(() => (init_oauth_signup_intent(), oauth_signup_intent_exports));
    const token = cookies().get(OAUTH_SIGNUP_ROLE_COOKIE2)?.value;
    return parseSignupRoleToken2(token);
  } catch {
    return null;
  }
}
var { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Always show Google account picker (avoids silent login as wrong account).
          prompt: "select_account"
        }
      }
    }),
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token || typeof token !== "string") return null;
        const record = await db.verificationToken.findUnique({
          where: { token }
        });
        if (!record?.identifier.startsWith("magic:")) return null;
        if (record.expires < /* @__PURE__ */ new Date()) {
          await db.verificationToken.delete({ where: { token } }).catch(() => {
          });
          return null;
        }
        const userId = record.identifier.slice("magic:".length);
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== "PATIENT") return null;
        const deletion = await resolveDeletedAccountOnLogin(user);
        if (deletion.blocked) return null;
        await db.verificationToken.delete({ where: { token } });
        if (!user.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: /* @__PURE__ */ new Date() }
          });
        }
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: /* @__PURE__ */ new Date()
          }
        });
        await audit.login(user.id);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          region: user.region,
          tokenVersion: user.tokenVersion
        };
      }
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        callbackUrl: { label: "Callback", type: "text" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, callbackUrl } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() }
        });
        if (!user || !user.passwordHash) return null;
        let originCookie = false;
        let returnPath = null;
        try {
          const hum = await readServerHumAuthCookies();
          originCookie = hum.originCookie;
          returnPath = hum.returnPath;
        } catch {
        }
        const effectiveCallback = resolveHumanitarianAuthCallback(callbackUrl, {
          originCookie,
          returnPath
        });
        const skipEmailVerification = canSkipHumanitarianEmailVerification(
          effectiveCallback,
          originCookie
        );
        if (!isAccountVerified(user)) {
          if (!skipEmailVerification) {
            throw new Error("EmailNotVerified");
          }
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: /* @__PURE__ */ new Date() }
          });
        }
        if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
          throw new Error("AccountLocked");
        }
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          const updated = await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
            select: { failedLoginAttempts: true }
          });
          if (updated.failedLoginAttempts >= 5) {
            await db.user.update({
              where: { id: user.id },
              data: { lockedUntil: new Date(Date.now() + 30 * 60 * 1e3) }
            });
          }
          return null;
        }
        const deletion = await resolveDeletedAccountOnLogin(user);
        if (deletion.blocked) return null;
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: /* @__PURE__ */ new Date()
          }
        });
        await audit.login(user.id);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          region: user.region,
          tokenVersion: user.tokenVersion
        };
      }
    })
  ],
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction
      }
    }
  },
  callbacks: {
    // Handle Google sign-in: create/link user manually (no PrismaAdapter needed)
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const googleEmail = user.email.toLowerCase();
          let dbUser = await db.user.findUnique({
            where: { email: googleEmail }
          });
          if (dbUser) {
            const deletion = await resolveDeletedAccountOnLogin(dbUser);
            if (deletion.blocked) return false;
          }
          if (!dbUser) {
            const intent = await readSignupIntent();
            if (!intent) {
              return "/signup/role";
            }
            const { role: signupRole, professionalKind, phoneE164 } = intent;
            const nameParts = (user.name || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            dbUser = await db.$transaction(async (tx) => {
              const newUser = await tx.user.create({
                data: {
                  email: googleEmail,
                  emailVerified: /* @__PURE__ */ new Date(),
                  role: signupRole,
                  region: "US"
                }
              });
              await createSignupProfile(tx, {
                userId: newUser.id,
                role: signupRole,
                professionalKind,
                firstName,
                lastName,
                avatarUrl: user.image || null
              });
              if (phoneE164) {
                await saveRegistrationPhone(tx, newUser.id, signupRole, phoneE164);
              }
              return newUser;
            });
          } else if (!dbUser.emailVerified) {
            await db.user.update({
              where: { id: dbUser.id },
              data: { emailVerified: /* @__PURE__ */ new Date() }
            });
          }
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId
              }
            }
          });
          if (!existingAccount) {
            await db.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token
              }
            });
          }
          return true;
        } catch (error) {
          console.error("[GOOGLE SIGNIN ERROR]", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.region = user.region;
        token.tokenVersion = user.tokenVersion ?? 0;
        token.tvCheckedAt = Date.now();
        if (user.email) token.email = user.email;
      }
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: { id: true, role: true, region: true, tokenVersion: true }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.region = dbUser.region;
          token.tokenVersion = dbUser.tokenVersion;
          token.tvCheckedAt = Date.now();
        }
      }
      const shouldRefreshProfileComplete = token.id && (user || account || trigger === "update" && session?.refreshProfileComplete || token.profileComplete === void 0);
      if (shouldRefreshProfileComplete) {
        const role = String(token.role ?? "");
        if (isProfileExemptRole(role)) {
          token.profileComplete = true;
        } else {
          const snapshot = await fetchUserProfileSnapshot(token.id);
          token.profileComplete = snapshot ? computeProfileComplete(snapshot) : true;
        }
      }
      const shouldLoadSpecialty = token.role === "PROFESSIONAL" && token.id && (user || account || token.professionalSpecialty === void 0);
      if (shouldLoadSpecialty) {
        const profile = await db.professionalProfile.findUnique({
          where: { userId: token.id },
          select: { specialty: true }
        });
        token.professionalSpecialty = profile?.specialty ?? null;
      } else if (token.role !== "PROFESSIONAL") {
        token.professionalSpecialty = null;
      }
      if (trigger === "update" && token.role === "PROFESSIONAL" && token.id && session?.refreshSpecialty) {
        const profile = await db.professionalProfile.findUnique({
          where: { userId: token.id },
          select: { specialty: true }
        });
        token.professionalSpecialty = profile?.specialty ?? null;
      }
      if (trigger === "update" && session?.clearVolunteerGuide) {
        token.showVolunteerGuide = false;
      } else if ((user || account) && isVolunteerGuideProviderRole(String(token.role ?? ""))) {
        token.showVolunteerGuide = true;
      }
      if (trigger === "update" && session?.consultActive) {
        const consultMaxAge = parseInt(
          process.env.SESSION_CONSULT_MAX_AGE_SECONDS || "7200",
          10
        );
        token.exp = Math.floor(Date.now() / 1e3) + consultMaxAge;
      }
      if (token.id) {
        const lastChecked = token.tvCheckedAt ?? 0;
        if (Date.now() - lastChecked > TOKEN_VERSION_CHECK_MS) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.id },
              select: { tokenVersion: true, lockedUntil: true }
            });
            if (!dbUser) return null;
            if (dbUser.lockedUntil && dbUser.lockedUntil > /* @__PURE__ */ new Date()) return null;
            const tokenVersion = token.tokenVersion ?? 0;
            if (dbUser.tokenVersion > tokenVersion) return null;
            token.tvCheckedAt = Date.now();
          } catch {
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.region = token.region;
        session.user.professionalSpecialty = token.professionalSpecialty ?? null;
        session.user.showVolunteerGuide = token.showVolunteerGuide === true;
        session.user.profileComplete = token.profileComplete !== false;
      }
      return session;
    }
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        const userId = token.id;
        await audit.logout(userId);
        const { closeJitSessionsForUser: closeJitSessionsForUser2 } = await Promise.resolve().then(() => (init_jit_session_lifecycle(), jit_session_lifecycle_exports));
        await closeJitSessionsForUser2(userId);
      }
    }
  }
});

// src/app/api/admin/rateio/route.ts
init_db();
import { Prisma } from "@prisma/client";

// src/lib/rateio.ts
import { createHash } from "crypto";
var COMMISSION_RATE = 0.15;
var DEFAULT_BASE_FRACTION = 0.3;
var DEFAULT_MERIT_FRACTION = 0.7;
var DEFAULT_MIN_VALID_CONSULTS = 10;
var DEFAULT_MIN_RATING = 3.5;
var REFUND_WINDOW_DAYS = 7;
var SHORT_CALL_SECONDS = 180;
var QUALITY_MIN = 0.8;
var QUALITY_MAX = 1.2;
function commissionCentsOf(grossCents) {
  return Math.round(grossCents * COMMISSION_RATE);
}
function qualityMultiplier(avgRating) {
  if (avgRating == null) return 1;
  const m = 0.9 + (avgRating - 3.5) * 0.2;
  return clamp(m, QUALITY_MIN, QUALITY_MAX);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function scoreOf(validConsults, qualityMult) {
  return validConsults * qualityMult;
}
function poolCentsOf(commissionCents, costFixedCents, costUsageCents) {
  return Math.max(0, commissionCents - costFixedCents - costUsageCents);
}
function splitPool(poolCents, inputs, baseFraction = DEFAULT_BASE_FRACTION, meritFraction = DEFAULT_MERIT_FRACTION) {
  const outputs = inputs.map((i) => {
    const qm = qualityMultiplier(i.avgRating);
    return {
      professionalId: i.professionalId,
      validConsults: i.validConsults,
      ratingUsed: i.avgRating,
      qualityMult: qm,
      score: i.qualified ? scoreOf(i.validConsults, qm) : 0,
      qualified: i.qualified,
      baseCents: 0,
      meritCents: 0,
      totalCents: 0
    };
  });
  const qualified = outputs.filter((o) => o.qualified);
  if (poolCents <= 0 || qualified.length === 0) return outputs;
  const basePool = Math.floor(poolCents * baseFraction);
  const meritPool = poolCents - basePool;
  const baseEach = Math.floor(basePool / qualified.length);
  qualified.forEach((o) => {
    o.baseCents = baseEach;
  });
  const totalScore = qualified.reduce((s, o) => s + o.score, 0);
  if (totalScore > 0) {
    qualified.forEach((o) => {
      o.meritCents = Math.floor(meritPool * o.score / totalScore);
    });
  }
  qualified.forEach((o) => {
    o.totalCents = o.baseCents + o.meritCents;
  });
  let distributed = qualified.reduce((s, o) => s + o.totalCents, 0);
  let leftover = poolCents - distributed;
  const byScoreDesc = [...qualified].sort(
    (a, b) => b.score - a.score || a.professionalId.localeCompare(b.professionalId)
  );
  let idx = 0;
  while (leftover > 0 && byScoreDesc.length > 0) {
    byScoreDesc[idx % byScoreDesc.length].meritCents += 1;
    byScoreDesc[idx % byScoreDesc.length].totalCents += 1;
    leftover -= 1;
    idx += 1;
  }
  return outputs;
}
function isEligible(validConsults, avgRating, minValidConsults = DEFAULT_MIN_VALID_CONSULTS, minRating = DEFAULT_MIN_RATING) {
  if (validConsults < minValidConsults) {
    return { qualified: false, reason: `Abaixo do m\xEDnimo de ${minValidConsults} consultas v\xE1lidas (${validConsults}).` };
  }
  if (avgRating != null && avgRating < minRating) {
    return { qualified: false, reason: `Nota m\xE9dia ${avgRating.toFixed(2)} abaixo do m\xEDnimo de ${minRating}.` };
  }
  return { qualified: true, reason: null };
}
function ledgerHash(prevHash, e) {
  const canonical = [
    prevHash ?? "GENESIS",
    e.type,
    e.category ?? "",
    e.amountCents,
    e.currency,
    e.competenceMonth,
    e.source,
    e.sourceRef ?? "",
    e.appointmentId ?? "",
    e.jitQueueId ?? "",
    e.occurredAt
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}
function isOutsideRefundWindow(paidAt, now, days = REFUND_WINDOW_DAYS) {
  const ms = days * 24 * 60 * 60 * 1e3;
  return now.getTime() - paidAt.getTime() >= ms;
}
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  return { from: new Date(y, m - 1, 1), toExclusive: new Date(y, m, 1) };
}

// src/app/api/admin/rateio/route.ts
var runtime = "nodejs";
var dynamic = "force-dynamic";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isLedgerDedupError(e) {
  return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.code === "P2034");
}
function logRateioDedup(context, detail) {
  console.log(`[RATEIO-DEDUP] ${context}`, detail);
}
async function authorize(req) {
  return (await authorizeContext(req)).ok;
}
async function authorizeContext(req) {
  const secret = req.headers.get("x-cron-secret");
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
    return { ok: true, isAdminSession: false, adminUserId: null };
  }
  const session = await auth();
  if (session?.user?.role === "ADMIN" && session.user.id) {
    return { ok: true, isAdminSession: true, adminUserId: session.user.id };
  }
  return { ok: false, isAdminSession: false, adminUserId: null };
}
function params(req) {
  const sp = new URL(req.url).searchParams;
  return {
    action: sp.get("action") || "",
    month: sp.get("month") || defaultMonth(),
    currency: sp.get("currency") || "BRL"
  };
}
function defaultMonth() {
  const n = /* @__PURE__ */ new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function assertExactlyOneProviderId(refs, context) {
  const present = [
    refs.professionalId || null,
    refs.psychoanalystId || null,
    refs.integrativeTherapistId || null
  ].filter((id) => !!id);
  if (present.length !== 1) {
    console.error("[RATEIO-INVALID-PROVIDER]", context, refs);
    throw new Error("Rateio provider invariant violated");
  }
}
function providerRefFromAppointment(a) {
  return {
    providerType: a.providerType,
    professionalId: a.providerType === "HEALTH" ? a.professionalId : null,
    psychoanalystId: a.providerType === "PSYCHOANALYST" ? a.psychoanalystId : null,
    integrativeTherapistId: a.providerType === "INTEGRATIVE_THERAPIST" ? a.integrativeTherapistId : null
  };
}
function providerRefFromHealthProfessional(professionalId) {
  return {
    providerType: "HEALTH",
    professionalId,
    psychoanalystId: null,
    integrativeTherapistId: null
  };
}
function validationProviderFields(refs, context) {
  assertExactlyOneProviderId(refs, context);
  return {
    providerType: refs.providerType,
    professionalId: refs.professionalId ?? null,
    psychoanalystId: refs.psychoanalystId ?? null,
    integrativeTherapistId: refs.integrativeTherapistId ?? null
  };
}
function providerKey(refs) {
  const id = refs.professionalId ?? refs.psychoanalystId ?? refs.integrativeTherapistId ?? "";
  return `${refs.providerType}:${id}`;
}
async function avgRatingForProvider(refs) {
  if (refs.providerType === "PSYCHOANALYST" && refs.psychoanalystId) {
    const agg = await db.psychoanalystReview.aggregate({
      _avg: { rating: true },
      where: { psychoanalystId: refs.psychoanalystId }
    });
    return agg._avg.rating ?? null;
  }
  if (refs.providerType === "HEALTH" && refs.professionalId) {
    const agg = await db.professionalReview.aggregate({
      _avg: { rating: true },
      where: { professionalId: refs.professionalId }
    });
    return agg._avg.rating ?? null;
  }
  return null;
}
function poolContributionUpsertWhere(poolPeriodId, refs) {
  assertExactlyOneProviderId(refs, "poolContributionUpsertWhere");
  if (refs.providerType === "PSYCHOANALYST") {
    return {
      poolPeriodId_psychoanalystId: {
        poolPeriodId,
        psychoanalystId: refs.psychoanalystId
      }
    };
  }
  if (refs.providerType === "INTEGRATIVE_THERAPIST") {
    return {
      poolPeriodId_integrativeTherapistId: {
        poolPeriodId,
        integrativeTherapistId: refs.integrativeTherapistId
      }
    };
  }
  return {
    poolPeriodId_professionalId: {
      poolPeriodId,
      professionalId: refs.professionalId
    }
  };
}
function poolContributionCreateFields(poolPeriodId, refs) {
  assertExactlyOneProviderId(refs, "poolContributionCreateFields");
  return {
    poolPeriodId,
    providerType: refs.providerType,
    professionalId: refs.professionalId ?? null,
    psychoanalystId: refs.psychoanalystId ?? null,
    integrativeTherapistId: refs.integrativeTherapistId ?? null
  };
}
async function collectCandidates(month, currency) {
  const { from, toExclusive } = monthBounds(month);
  const out = [];
  const appts = await db.appointment.findMany({
    where: {
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency,
      OR: [
        { professionalId: { not: null } },
        { psychoanalystId: { not: null } },
        { integrativeTherapistId: { not: null } }
      ]
    },
    select: {
      id: true,
      priceAmount: true,
      currency: true,
      paidAt: true,
      providerType: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
      professional: { select: { userId: true } },
      psychoanalyst: { select: { userId: true } },
      integrativeTherapist: { select: { userId: true } },
      patient: { select: { user: { select: { id: true, emailVerified: true } } } }
    }
  });
  const apptIds = appts.map((a) => a.id);
  const docs = apptIds.length ? await db.medicalDocument.findMany({
    where: { appointmentId: { in: apptIds } },
    select: { appointmentId: true }
  }) : [];
  const withDoc = new Set(docs.map((d) => d.appointmentId).filter(Boolean));
  for (const a of appts) {
    const refs = providerRefFromAppointment(a);
    assertExactlyOneProviderId(refs, `collectCandidates appt=${a.id}`);
    const professionalUserId = a.providerType === "PSYCHOANALYST" ? a.psychoanalyst?.userId ?? null : a.providerType === "INTEGRATIVE_THERAPIST" ? a.integrativeTherapist?.userId ?? null : a.professional?.userId ?? null;
    out.push({
      kind: "appt",
      refId: a.id,
      providerType: a.providerType,
      professionalId: refs.professionalId ?? null,
      psychoanalystId: refs.psychoanalystId ?? null,
      integrativeTherapistId: refs.integrativeTherapistId ?? null,
      professionalUserId,
      patientUserId: a.patient?.user?.id ?? null,
      patientEmailVerified: !!a.patient?.user?.emailVerified,
      grossCents: a.priceAmount || 0,
      currency: a.currency || currency,
      paidAt: a.paidAt,
      callConnected: true,
      // provisório (COMPLETED); endurecido depois via webhook Daily
      durationSeconds: null,
      // sem duração real para agendadas hoje
      hasClinicalRecord: withDoc.has(a.id)
    });
  }
  const jits = await db.jitPayment.findMany({
    where: {
      status: "paid",
      currency,
      OR: [
        { paidAt: { not: null, gte: from, lt: toExclusive } },
        { paidAt: null, createdAt: { gte: from, lt: toExclusive } }
      ],
      queueEntry: { is: { session: { is: { professionalId: { not: void 0 } } } } }
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      queueEntry: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          patientUserId: true,
          patientUser: { select: { id: true, emailVerified: true } },
          session: { select: { professionalId: true, professional: { select: { userId: true } } } }
        }
      }
    }
  });
  for (const j of jits) {
    const q = j.queueEntry;
    if (!q || !q.session?.professionalId) continue;
    let dur = null;
    if (q.startedAt && q.endedAt) {
      dur = Math.max(0, Math.round((q.endedAt.getTime() - q.startedAt.getTime()) / 1e3));
    }
    const jitRefs = providerRefFromHealthProfessional(q.session.professionalId);
    out.push({
      kind: "jit",
      refId: q.id,
      providerType: "HEALTH",
      professionalId: jitRefs.professionalId ?? null,
      psychoanalystId: null,
      integrativeTherapistId: null,
      professionalUserId: q.session.professional?.userId ?? null,
      patientUserId: q.patientUser?.id ?? q.patientUserId ?? null,
      patientEmailVerified: !!q.patientUser?.emailVerified,
      grossCents: j.amount || 0,
      currency: j.currency || currency,
      paidAt: j.paidAt ?? j.createdAt,
      callConnected: !!q.startedAt,
      durationSeconds: dur,
      hasClinicalRecord: false
      // Plantão não vincula documento no schema atual (não usado como gate)
    });
  }
  return out;
}
function evaluate(c, now) {
  const flags = [];
  const sameUser = !!c.patientUserId && c.patientUserId === c.professionalUserId;
  if (sameUser) flags.push("patient_eq_professional");
  if (!c.patientEmailVerified) flags.push("patient_email_unverified");
  let underReview = false;
  if (c.kind === "jit" && c.durationSeconds != null && c.durationSeconds < SHORT_CALL_SECONDS) {
    flags.push("short_call");
    underReview = true;
  }
  const paymentSettled = true;
  const outsideRefundWindow = isOutsideRefundWindow(c.paidAt, now);
  const patientVerified = !!c.patientUserId && !sameUser && c.patientEmailVerified;
  const isValid = paymentSettled && outsideRefundWindow && patientVerified && c.callConnected && !underReview;
  return {
    paymentSettled,
    outsideRefundWindow,
    patientVerified,
    callConnected: c.callConnected,
    durationSeconds: c.durationSeconds,
    hasClinicalRecord: c.hasClinicalRecord,
    grossCents: c.grossCents,
    commissionCents: commissionCentsOf(c.grossCents),
    fraudFlags: flags,
    fraudScore: flags.length,
    underReview,
    isValid
  };
}
async function doValidate(month, currency) {
  const now = /* @__PURE__ */ new Date();
  const cands = await collectCandidates(month, currency);
  let valid = 0;
  for (const c of cands) {
    const v = evaluate(c, now);
    if (v.isValid) valid++;
    const providerFields = validationProviderFields(
      {
        providerType: c.providerType,
        professionalId: c.professionalId,
        psychoanalystId: c.psychoanalystId,
        integrativeTherapistId: c.integrativeTherapistId
      },
      `doValidate ${c.kind}=${c.refId}`
    );
    const data = {
      ...providerFields,
      competenceMonth: month,
      currency,
      paymentSettled: v.paymentSettled,
      outsideRefundWindow: v.outsideRefundWindow,
      patientVerified: v.patientVerified,
      callConnected: v.callConnected,
      durationSeconds: v.durationSeconds,
      hasClinicalRecord: v.hasClinicalRecord,
      grossCents: v.grossCents,
      commissionCents: v.commissionCents,
      fraudFlags: v.fraudFlags,
      fraudScore: v.fraudScore,
      underReview: v.underReview,
      isValid: v.isValid
    };
    if (c.kind === "appt") {
      await db.consultationValidation.upsert({
        where: { appointmentId: c.refId },
        create: { appointmentId: c.refId, ...data },
        update: data
      });
    } else {
      await db.consultationValidation.upsert({
        where: { jitQueueId: c.refId },
        create: { jitQueueId: c.refId, ...data },
        update: data
      });
    }
  }
  return { candidates: cands.length, valid };
}
async function doLedger(month, currency) {
  const valids = await db.consultationValidation.findMany({
    where: { competenceMonth: month, currency, isValid: true },
    select: { appointmentId: true, jitQueueId: true, commissionCents: true, createdAt: true }
  });
  let written = 0;
  for (const v of valids) {
    const refKey = v.appointmentId ? `appt:${v.appointmentId}` : `jit:${v.jitQueueId}`;
    try {
      const created = await db.$transaction(
        async (tx) => {
          const existing = await tx.ledgerEntry.findFirst({
            where: {
              type: "COMMISSION_IN",
              ...v.appointmentId ? { appointmentId: v.appointmentId } : { jitQueueId: v.jitQueueId }
            },
            select: { id: true }
          });
          if (existing) return false;
          const last = await tx.ledgerEntry.findFirst({
            orderBy: { createdAt: "desc" },
            select: { hash: true }
          });
          const occurredAt = v.createdAt ?? /* @__PURE__ */ new Date();
          const sourceRef = `commission:${v.appointmentId ? "appt" : "jit"}:${v.appointmentId ?? v.jitQueueId}`;
          const hash = ledgerHash(last?.hash ?? null, {
            type: "COMMISSION_IN",
            category: null,
            amountCents: v.commissionCents,
            currency,
            competenceMonth: month,
            source: "SYSTEM",
            sourceRef,
            appointmentId: v.appointmentId ?? null,
            jitQueueId: v.jitQueueId ?? null,
            occurredAt: occurredAt.toISOString()
          });
          await tx.ledgerEntry.create({
            data: {
              type: "COMMISSION_IN",
              category: null,
              amountCents: v.commissionCents,
              currency,
              competenceMonth: month,
              source: "SYSTEM",
              sourceRef,
              appointmentId: v.appointmentId ?? void 0,
              jitQueueId: v.jitQueueId ?? void 0,
              prevHash: last?.hash ?? null,
              hash,
              occurredAt
            }
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      if (created) written++;
    } catch (e) {
      if (isLedgerDedupError(e)) {
        logRateioDedup(`doLedger skipped ${refKey}`, e);
        continue;
      }
      throw e;
    }
  }
  return { commissionsWritten: written };
}
var RATEIO_RECEIPT_PREFIX = "rateio-receipts/";
function parseTaxRate() {
  const defaultRate = 0.05;
  const raw = process.env.RATEIO_TAX_RATE;
  if (!raw?.trim()) return defaultRate;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n >= 1) {
    console.log("[RATEIO-TAX-CONFIG]", { raw, using: defaultRate });
    return defaultRate;
  }
  return n;
}
function autoTaxSourceRef(month, currency) {
  return `AUTO-TAX-${month}-${currency}`;
}
function normalizeAttachmentKey(raw) {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim();
  if (!key.startsWith(RATEIO_RECEIPT_PREFIX)) {
    throw new Error("INVALID_ATTACHMENT_KEY");
  }
  return key;
}
async function createLedgerCostEntry(tx, params2) {
  const last = await tx.ledgerEntry.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true }
  });
  const hash = ledgerHash(last?.hash ?? null, {
    type: params2.type,
    category: params2.category,
    amountCents: params2.amountCents,
    currency: params2.currency,
    competenceMonth: params2.competenceMonth,
    source: params2.source,
    sourceRef: params2.sourceRef,
    appointmentId: null,
    jitQueueId: null,
    occurredAt: params2.occurredAt.toISOString()
  });
  return tx.ledgerEntry.create({
    data: {
      type: params2.type,
      category: params2.category,
      amountCents: params2.amountCents,
      currency: params2.currency,
      competenceMonth: params2.competenceMonth,
      source: params2.source,
      sourceRef: params2.sourceRef,
      attachmentKey: params2.attachmentKey ?? null,
      invoiceUrl: params2.invoiceUrl ?? null,
      prevHash: last?.hash ?? null,
      hash,
      occurredAt: params2.occurredAt
    },
    select: { id: true, hash: true }
  });
}
async function ensureAutoTaxEntries(month, currency, opts = {}) {
  const taxRate = parseTaxRate();
  const taxRef = autoTaxSourceRef(month, currency);
  const backoffs = [100, 200, 400];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.$transaction(
        async (tx) => {
          const commissionAgg = await tx.ledgerEntry.aggregate({
            where: { competenceMonth: month, currency, type: "COMMISSION_IN" },
            _sum: { amountCents: true }
          });
          const totalCommission = commissionAgg._sum.amountCents ?? 0;
          const expectedTax = Math.round(totalCommission * taxRate);
          const existingTax = await tx.ledgerEntry.findFirst({
            where: { competenceMonth: month, currency, sourceRef: taxRef },
            select: { id: true, amountCents: true }
          });
          if (!existingTax) {
            if (expectedTax <= 0) return;
            await createLedgerCostEntry(tx, {
              type: "COST_FIXED",
              category: "OTHER",
              amountCents: expectedTax,
              currency,
              competenceMonth: month,
              source: "SYSTEM",
              sourceRef: taxRef,
              occurredAt: /* @__PURE__ */ new Date()
            });
            return;
          }
          if (!opts.force) return;
          const diff = expectedTax - existingTax.amountCents;
          if (diff > 0) {
            await createLedgerCostEntry(tx, {
              type: "COST_FIXED",
              category: "OTHER",
              amountCents: diff,
              currency,
              competenceMonth: month,
              source: "SYSTEM",
              sourceRef: `AUTO-TAX-ADJ-${month}-${currency}-${Date.now()}`,
              occurredAt: /* @__PURE__ */ new Date()
            });
          } else if (diff < 0) {
            console.log("[RATEIO-TAX-ADJ-SKIPPED]", { month, currency, diff, expectedTax, existing: existingTax.amountCents });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) {
        await sleep(backoffs[attempt] ?? 400);
        continue;
      }
      throw e;
    }
  }
}
async function doListCosts(month, currency) {
  const costs = await db.ledgerEntry.findMany({
    where: {
      competenceMonth: month,
      currency,
      type: { in: ["COST_FIXED", "COST_USAGE"] }
    },
    orderBy: { occurredAt: "desc" },
    select: {
      id: true,
      type: true,
      category: true,
      amountCents: true,
      source: true,
      sourceRef: true,
      attachmentKey: true,
      occurredAt: true
    }
  });
  return { costs };
}
async function doCost(req, month, currency) {
  const body = await req.json().catch(() => ({}));
  const type = body.type === "COST_FIXED" || body.type === "COST_USAGE" ? body.type : null;
  if (!type) return { error: "type deve ser COST_FIXED ou COST_USAGE" };
  const amountCents = Math.round(Number(body.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) return { error: "amountCents inv\xE1lido" };
  const category = String(body.category || "OTHER");
  const source = String(body.source || "MANUAL_INVOICE");
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : /* @__PURE__ */ new Date();
  let attachmentKey = null;
  try {
    attachmentKey = normalizeAttachmentKey(body.attachmentKey);
  } catch {
    return { error: "attachmentKey must start with rateio-receipts/" };
  }
  const manualSourceRef = typeof body.sourceRef === "string" && body.sourceRef.trim() ? body.sourceRef.trim() : typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : null;
  const backoffs = [100, 200, 400];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = await db.$transaction(
        async (tx) => createLedgerCostEntry(tx, {
          type,
          category,
          amountCents,
          currency,
          competenceMonth: month,
          source,
          sourceRef: manualSourceRef,
          attachmentKey,
          invoiceUrl: body.invoiceUrl ?? null,
          occurredAt
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return { ok: true, entry };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) {
        await sleep(backoffs[attempt] ?? 400);
        continue;
      }
      if (isLedgerDedupError(e)) {
        logRateioDedup("doCost skipped (dedup/serialization)", e);
        return { ok: false, deduped: true };
      }
      throw e;
    }
  }
  return { error: "Falha ao gravar custo ap\xF3s retries de serializa\xE7\xE3o" };
}
async function computePool(month, currency) {
  const [commission, fixed, usage] = await Promise.all([
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COMMISSION_IN" } }),
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COST_FIXED" } }),
    db.ledgerEntry.aggregate({ _sum: { amountCents: true }, where: { competenceMonth: month, currency, type: "COST_USAGE" } })
  ]);
  const commissionCents = commission._sum.amountCents ?? 0;
  const costFixedCents = fixed._sum.amountCents ?? 0;
  const costUsageCents = usage._sum.amountCents ?? 0;
  const poolCents = poolCentsOf(commissionCents, costFixedCents, costUsageCents);
  const valids = await db.consultationValidation.findMany({
    where: { competenceMonth: month, currency, isValid: true },
    select: {
      providerType: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true
    }
  });
  const grouped = /* @__PURE__ */ new Map();
  for (const v of valids) {
    const refs = {
      providerType: v.providerType,
      professionalId: v.professionalId,
      psychoanalystId: v.psychoanalystId,
      integrativeTherapistId: v.integrativeTherapistId
    };
    assertExactlyOneProviderId(refs, "computePool groupBy");
    const key = providerKey(refs);
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { refs, count: 1 });
  }
  const inputs = [];
  for (const { refs, count } of grouped.values()) {
    const avgRating = await avgRatingForProvider(refs);
    const validConsults = count;
    const elig = isEligible(validConsults, avgRating);
    const profileId = refs.professionalId ?? refs.psychoanalystId ?? refs.integrativeTherapistId ?? "";
    inputs.push({
      providerType: refs.providerType,
      providerProfessionalId: refs.professionalId ?? null,
      psychoanalystId: refs.psychoanalystId ?? null,
      integrativeTherapistId: refs.integrativeTherapistId ?? null,
      professionalId: profileId,
      validConsults,
      avgRating,
      qualified: elig.qualified
    });
  }
  const outputs = splitPool(poolCents, inputs);
  const extendedOutputs = outputs.map((o, idx) => ({
    ...o,
    providerType: inputs[idx].providerType,
    providerProfessionalId: inputs[idx].providerProfessionalId,
    psychoanalystId: inputs[idx].psychoanalystId,
    integrativeTherapistId: inputs[idx].integrativeTherapistId
  }));
  const eligByPro = new Map(
    inputs.map((i) => [
      providerKey({
        providerType: i.providerType,
        professionalId: i.providerProfessionalId,
        psychoanalystId: i.psychoanalystId,
        integrativeTherapistId: i.integrativeTherapistId
      }),
      isEligible(i.validConsults, i.avgRating)
    ])
  );
  return {
    commissionCents,
    costFixedCents,
    costUsageCents,
    poolCents,
    outputs: extendedOutputs,
    eligByPro
  };
}
async function doPreview(month, currency) {
  const p = await computePool(month, currency);
  return {
    month,
    currency,
    commissionCents: p.commissionCents,
    costFixedCents: p.costFixedCents,
    costUsageCents: p.costUsageCents,
    poolCents: p.poolCents,
    baseFraction: DEFAULT_BASE_FRACTION,
    meritFraction: DEFAULT_MERIT_FRACTION,
    minValidConsults: DEFAULT_MIN_VALID_CONSULTS,
    minRating: DEFAULT_MIN_RATING,
    contributions: p.outputs.map((o) => ({
      ...o,
      disqualReason: o.qualified ? null : p.eligByPro.get(
        providerKey({
          providerType: o.providerType,
          professionalId: o.providerProfessionalId,
          psychoanalystId: o.psychoanalystId,
          integrativeTherapistId: o.integrativeTherapistId
        })
      )?.reason ?? null
    }))
  };
}
async function doClose(month, currency, opts = {}) {
  const existing = await db.poolPeriod.findUnique({
    where: { month_currency: { month, currency } }
  });
  if (existing && existing.status !== "OPEN") {
    if (!opts.force) {
      return {
        conflict: true,
        error: "PERIOD_ALREADY_CLOSED",
        status: existing.status,
        lockedAt: existing.lockedAt ? existing.lockedAt.toISOString() : null
      };
    }
  }
  await ensureAutoTaxEntries(month, currency, { force: opts.force ?? false });
  const p = await computePool(month, currency);
  const last = await db.ledgerEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { hash: true } });
  if (existing && existing.status !== "OPEN" && opts.force && opts.adminUserId) {
    console.log("[RATEIO-FORCE-RECLOSE]", {
      adminId: opts.adminUserId,
      month,
      currency,
      old: {
        status: existing.status,
        commissionCents: existing.commissionCents,
        costFixedCents: existing.costFixedCents,
        costUsageCents: existing.costUsageCents,
        poolCents: existing.poolCents,
        lockedAt: existing.lockedAt?.toISOString() ?? null
      },
      new: {
        commissionCents: p.commissionCents,
        costFixedCents: p.costFixedCents,
        costUsageCents: p.costUsageCents,
        poolCents: p.poolCents
      }
    });
  }
  const period = await db.poolPeriod.upsert({
    where: { month_currency: { month, currency } },
    create: {
      month,
      currency,
      commissionCents: p.commissionCents,
      costFixedCents: p.costFixedCents,
      costUsageCents: p.costUsageCents,
      poolCents: p.poolCents,
      baseFraction: DEFAULT_BASE_FRACTION,
      meritFraction: DEFAULT_MERIT_FRACTION,
      minValidConsults: DEFAULT_MIN_VALID_CONSULTS,
      minRating: DEFAULT_MIN_RATING,
      status: "LOCKED",
      lockedAt: /* @__PURE__ */ new Date(),
      ledgerHashAtLock: last?.hash ?? null
    },
    update: {
      commissionCents: p.commissionCents,
      costFixedCents: p.costFixedCents,
      costUsageCents: p.costUsageCents,
      poolCents: p.poolCents,
      status: "LOCKED",
      lockedAt: /* @__PURE__ */ new Date(),
      ledgerHashAtLock: last?.hash ?? null
    },
    select: { id: true }
  });
  await db.ledgerEntry.updateMany({
    where: { competenceMonth: month, currency, poolPeriodId: null },
    data: { poolPeriodId: period.id }
  });
  for (const o of p.outputs) {
    const refs = {
      providerType: o.providerType,
      professionalId: o.providerProfessionalId,
      psychoanalystId: o.psychoanalystId,
      integrativeTherapistId: o.integrativeTherapistId
    };
    const reason = o.qualified ? null : p.eligByPro.get(providerKey(refs))?.reason ?? null;
    const data = {
      validConsults: o.validConsults,
      ratingUsed: o.ratingUsed,
      qualityMult: o.qualityMult,
      score: o.score,
      qualified: o.qualified,
      disqualReason: reason,
      baseCents: o.baseCents,
      meritCents: o.meritCents,
      totalCents: o.totalCents
    };
    await db.poolContribution.upsert({
      where: poolContributionUpsertWhere(period.id, refs),
      create: { ...poolContributionCreateFields(period.id, refs), ...data },
      update: data
    });
  }
  return {
    poolPeriodId: period.id,
    month,
    currency,
    poolCents: p.poolCents,
    professionals: p.outputs.length,
    distributedCents: p.outputs.reduce((s, o) => s + o.totalCents, 0)
  };
}
async function GET(req) {
  if (!await authorize(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, month, currency } = params(req);
  try {
    if (action === "preview") return NextResponse.json(await doPreview(month, currency));
    if (action === "costs") return NextResponse.json(await doListCosts(month, currency));
    return NextResponse.json({ error: "A\xE7\xE3o GET inv\xE1lida. Use ?action=preview|costs" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
async function POST(req) {
  const authCtx = await authorizeContext(req);
  if (!authCtx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, month, currency } = params(req);
  try {
    switch (action) {
      case "validate":
        return NextResponse.json(await doValidate(month, currency));
      case "ledger":
        return NextResponse.json(await doLedger(month, currency));
      case "cost":
        return NextResponse.json(await doCost(req, month, currency));
      case "close": {
        const body = await req.json().catch(() => ({}));
        const force = body.force === true;
        if (force && !authCtx.isAdminSession) {
          return NextResponse.json(
            { error: "FORCE_REQUIRES_ADMIN_SESSION" },
            { status: 403 }
          );
        }
        const result = await doClose(month, currency, {
          force,
          adminUserId: authCtx.isAdminSession ? authCtx.adminUserId : null
        });
        if ("conflict" in result && result.conflict) {
          return NextResponse.json(
            {
              error: result.error,
              status: result.status,
              lockedAt: result.lockedAt
            },
            { status: 409 }
          );
        }
        return NextResponse.json(result);
      }
      case "run": {
        const v = await doValidate(month, currency);
        const l = await doLedger(month, currency);
        const period = await db.poolPeriod.findUnique({
          where: { month_currency: { month, currency } },
          select: { status: true }
        });
        let c;
        if (period && period.status !== "OPEN") {
          console.log(
            `[RATEIO-RUN] Skipping close for ${month}/${currency}: period status=${period.status}`
          );
          c = { skipped: true, reason: "PERIOD_NOT_OPEN", status: period.status };
        } else {
          c = await doClose(month, currency);
        }
        return NextResponse.json({ validate: v, ledger: l, close: c });
      }
      default:
        return NextResponse.json({ error: "A\xE7\xE3o inv\xE1lida. Use validate|ledger|cost|close|run" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export {
  GET,
  POST,
  dynamic,
  runtime
};
