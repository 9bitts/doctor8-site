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

// src/app/api/professional/financeiro/rateio/route.ts
import { NextResponse as NextResponse3 } from "next/server";

// src/lib/api-auth.ts
import { NextResponse as NextResponse2 } from "next/server";

// src/lib/auth.ts
init_db();
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// src/lib/audit.ts
init_db();
import { AuditAction } from "@prisma/client";
import { headers } from "next/headers";
async function createAuditLog(params) {
  try {
    const headersList = headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: ipAddress.split(",")[0].trim(),
        // first IP if behind proxy
        userAgent: userAgent.substring(0, 500),
        // truncate long agents
        details: params.details
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

// src/lib/api-auth.ts
init_db();

// src/lib/organization-auth.ts
init_db();
import { NextResponse } from "next/server";

// src/lib/api-auth.ts
function isApiError(v) {
  return typeof v === "object" && v !== null && "error" in v;
}
async function requireAuth(allowedRoles) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse2.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role) && session.user.role !== "ADMIN") {
    return { error: NextResponse2.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, userId: session.user.id };
}
async function requireProfessionalApi() {
  const ctx = await requireAuth(["PROFESSIONAL"]);
  if (isApiError(ctx)) return ctx;
  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, userId: true, firstName: true, lastName: true }
  });
  if (!professional) {
    return { error: NextResponse2.json({ error: "No profile" }, { status: 404 }) };
  }
  return { session: ctx.session, userId: ctx.userId, professional };
}

// src/app/api/professional/financeiro/rateio/route.ts
init_db();

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
function qualityMultiplier(avgRating) {
  if (avgRating == null) return 1;
  const m = 0.9 + (avgRating - 3.5) * 0.2;
  return clamp(m, QUALITY_MIN, QUALITY_MAX);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function isOutsideRefundWindow(paidAt, now, days = REFUND_WINDOW_DAYS) {
  const ms = days * 24 * 60 * 60 * 1e3;
  return now.getTime() - paidAt.getTime() >= ms;
}
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  return { from: new Date(y, m - 1, 1), toExclusive: new Date(y, m, 1) };
}

// src/app/api/professional/financeiro/rateio/route.ts
var dynamic = "force-dynamic";
function currentMonth() {
  const n = /* @__PURE__ */ new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function defaultRules() {
  const minRating = DEFAULT_MIN_RATING;
  return {
    commissionRate: COMMISSION_RATE,
    baseFraction: DEFAULT_BASE_FRACTION,
    meritFraction: DEFAULT_MERIT_FRACTION,
    minValidConsults: DEFAULT_MIN_VALID_CONSULTS,
    minRating,
    refundWindowDays: REFUND_WINDOW_DAYS,
    shortCallSeconds: SHORT_CALL_SECONDS,
    qualityMin: QUALITY_MIN,
    qualityMax: QUALITY_MAX,
    ratingMultiplierAtMin: qualityMultiplier(minRating)
  };
}
async function resolveEffectiveRules(currency, month) {
  const defaults = defaultRules();
  const openPeriod = await db.poolPeriod.findUnique({
    where: { month_currency: { month, currency } },
    select: {
      status: true,
      baseFraction: true,
      meritFraction: true,
      minValidConsults: true,
      minRating: true
    }
  });
  if (openPeriod?.status === "OPEN") {
    const minRating = openPeriod.minRating;
    return {
      ...defaults,
      baseFraction: openPeriod.baseFraction,
      meritFraction: openPeriod.meritFraction,
      minValidConsults: openPeriod.minValidConsults,
      minRating,
      ratingMultiplierAtMin: qualityMultiplier(minRating)
    };
  }
  return defaults;
}
async function computeMyProgress(professionalId, currency, rules) {
  const month = currentMonth();
  const { from, toExclusive } = monthBounds(month);
  const now = /* @__PURE__ */ new Date();
  const appts = await db.appointment.findMany({
    where: {
      professionalId,
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency
    },
    select: { paidAt: true }
  });
  let validConsults = 0;
  let pendingRefundWindow = 0;
  for (const a of appts) {
    if (!a.paidAt) continue;
    if (isOutsideRefundWindow(a.paidAt, now, rules.refundWindowDays)) {
      validConsults += 1;
    } else {
      pendingRefundWindow += 1;
    }
  }
  const ratingAgg = await db.professionalReview.aggregate({
    _avg: { rating: true },
    where: { professionalId }
  });
  const avgRating = ratingAgg._avg.rating ?? null;
  const qualified = validConsults >= rules.minValidConsults && (avgRating === null || avgRating >= rules.minRating);
  return {
    month,
    validConsults,
    pendingRefundWindow,
    avgRating,
    qualified
  };
}
async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, currency: true }
  });
  if (!professional) return NextResponse3.json({ error: "Profile not found" }, { status: 404 });
  const currency = professional.currency || "BRL";
  const month = currentMonth();
  const rules = await resolveEffectiveRules(currency, month);
  const myProgress = await computeMyProgress(professional.id, currency, rules);
  const latestPeriod = await db.poolPeriod.findFirst({
    where: { status: "LOCKED", currency },
    orderBy: { month: "desc" }
  }) || await db.poolPeriod.findFirst({
    where: { status: "LOCKED" },
    orderBy: { lockedAt: "desc" }
  });
  if (!latestPeriod) {
    return NextResponse3.json({ latest: null, history: [], rules, myProgress });
  }
  const costGroups = await db.ledgerEntry.groupBy({
    by: ["type", "category", "source"],
    where: {
      poolPeriodId: latestPeriod.id,
      type: { in: ["COST_FIXED", "COST_USAGE"] }
    },
    _sum: { amountCents: true }
  });
  const costBreakdown = costGroups.map((g) => ({
    type: g.type,
    category: g.category || "OTHER",
    source: g.source,
    amountCents: g._sum.amountCents ?? 0
  })).filter((c) => c.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents);
  const professionalsCount = await db.poolContribution.count({
    where: { poolPeriodId: latestPeriod.id, qualified: true }
  });
  const mineRow = await db.poolContribution.findUnique({
    where: {
      poolPeriodId_professionalId: {
        poolPeriodId: latestPeriod.id,
        professionalId: professional.id
      }
    },
    select: {
      validConsults: true,
      qualified: true,
      disqualReason: true,
      qualityMult: true,
      score: true,
      baseCents: true,
      meritCents: true,
      totalCents: true,
      payoutStatus: true
    }
  });
  const myContribs = await db.poolContribution.findMany({
    where: { professionalId: professional.id },
    select: {
      totalCents: true,
      qualified: true,
      poolPeriod: { select: { month: true, currency: true, poolCents: true, status: true } }
    },
    orderBy: { poolPeriod: { month: "desc" } }
  });
  const history = myContribs.filter((c) => c.poolPeriod.status === "LOCKED" || c.poolPeriod.status === "PAID").map((c) => ({
    month: c.poolPeriod.month,
    currency: c.poolPeriod.currency,
    poolCents: c.poolPeriod.poolCents,
    totalCents: c.totalCents,
    qualified: c.qualified
  }));
  return NextResponse3.json({
    latest: {
      month: latestPeriod.month,
      currency: latestPeriod.currency,
      commissionCents: latestPeriod.commissionCents,
      costFixedCents: latestPeriod.costFixedCents,
      costUsageCents: latestPeriod.costUsageCents,
      poolCents: latestPeriod.poolCents,
      baseFraction: latestPeriod.baseFraction,
      meritFraction: latestPeriod.meritFraction,
      lockedAt: latestPeriod.lockedAt ? latestPeriod.lockedAt.toISOString() : null,
      professionalsCount,
      costBreakdown,
      mine: mineRow
    },
    history,
    rules,
    myProgress
  });
}
export {
  GET,
  dynamic
};
