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
var db_exports = {};
__export(db_exports, {
  db: () => db
});
import { PrismaClient } from "@prisma/client";
var globalForPrisma, db;
var init_db = __esm({
  "src/lib/db.ts"() {
    "use strict";
    globalForPrisma = globalThis;
    db = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
    });
    globalForPrisma.prisma = db;
  }
});

// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
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
function decrypt(ciphertext) {
  if (!ciphertext || !ciphertext.includes(":")) return ciphertext;
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
var ALGORITHM;
var init_encryption = __esm({
  "src/lib/encryption.ts"() {
    "use strict";
    ALGORITHM = "aes-256-gcm";
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

// src/app/api/payments/checkout-consultation/route.ts
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

// src/lib/save-registration-phone.ts
init_encryption();

// src/lib/user-phone.ts
init_encryption();
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
init_encryption();
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
var isProduction = process.env.NODE_ENV === "production";
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

// src/app/api/payments/checkout-consultation/route.ts
init_db();

// src/lib/stripe.ts
import Stripe from "stripe";
var stripeInstance = null;
var stripe = new Proxy({}, {
  get(_target, prop) {
    if (!stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
      stripeInstance = new Stripe(key, { apiVersion: "2024-06-20", typescript: true });
    }
    return stripeInstance[prop];
  }
});
async function getOrCreateStripeCustomer(userId, email, name) {
  const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const sub = await db2.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  await db2.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id, status: "inactive" },
    update: { stripeCustomerId: customer.id }
  });
  return customer.id;
}

// src/lib/providers.ts
init_db();

// src/lib/profession-label.ts
var PSYCHOLOGY = /* @__PURE__ */ new Set([
  "Psychologist",
  "Psychology",
  "Psychoanalyst",
  "Neuropsychologist",
  "Psychotherapist",
  "Behavioral Therapist"
]);
var NUTRITION = /* @__PURE__ */ new Set(["Nutritionist", "Dietitian"]);
var PHYSIO = /* @__PURE__ */ new Set(["Physiotherapist", "Physical Therapist", "Occupational Therapist"]);
var NURSING = /* @__PURE__ */ new Set(["Nurse", "Nursing"]);
var DENTISTRY = /* @__PURE__ */ new Set(["Dentist", "Dental Surgeon"]);
function getProfessionInfo(specialty) {
  const s = specialty.trim();
  if (PSYCHOLOGY.has(s)) return { typeKey: "psychologist", councilKey: "crp" };
  if (NUTRITION.has(s)) return { typeKey: "nutritionist", councilKey: "crn_nutrition" };
  if (PHYSIO.has(s)) return { typeKey: "physiotherapist", councilKey: "crefito" };
  if (NURSING.has(s)) return { typeKey: "nurse", councilKey: "crn" };
  if (DENTISTRY.has(s)) return { typeKey: "dentist", councilKey: "cro" };
  return { typeKey: "doctor", councilKey: "crm" };
}
function formatLicense(licenseNumber, licenseState, councilKey) {
  const prefix = councilKey.toUpperCase().replace("_NUTRITION", "N");
  const num = licenseNumber.trim();
  if (!num) return "";
  if (licenseState) return `${prefix} ${num}/${licenseState}`;
  return `${prefix} ${num}`;
}

// src/lib/professions.ts
var PSYCHOANALYSIS_SPECIALTY = "Psychoanalysis";
var PROFESSION_GROUPS = [
  { groupKey: "set.profGroup.medical", options: [
    "Acupuncture",
    "Allergy and Immunology",
    "Anesthesiology",
    "Angiology",
    "Cardiology",
    "Cardiovascular Surgery",
    "Hand Surgery",
    "Head and Neck Surgery",
    "Digestive System Surgery",
    "General Surgery",
    "Pediatric Surgery",
    "Plastic Surgery",
    "Thoracic Surgery",
    "Vascular Surgery",
    "Internal Medicine",
    "Coloproctology",
    "Dermatology",
    "Endocrinology and Metabolism",
    "Endoscopy",
    "Gastroenterology",
    "Medical Genetics",
    "Geriatrics",
    "Gynecology and Obstetrics",
    "Hematology and Hemotherapy",
    "Homeopathy",
    "Infectious Diseases",
    "Mastology",
    "Family and Community Medicine",
    "Physical Medicine and Rehabilitation",
    "Occupational Medicine",
    "Sports Medicine",
    "Emergency Medicine",
    "Legal Medicine and Forensics",
    "Nuclear Medicine",
    "Intensive Care Medicine",
    "Preventive and Social Medicine",
    "Nephrology",
    "Neurosurgery",
    "Neurology",
    "Nutrology",
    "Ophthalmology",
    "Oncology",
    "Orthopedics and Traumatology",
    "Otorhinolaryngology (ENT)",
    "Pathology",
    "Clinical Pathology / Laboratory Medicine",
    "Pediatrics",
    "Pneumology",
    "Psychiatry",
    "Radiology and Diagnostic Imaging",
    "Radiotherapy",
    "Rheumatology",
    "Urology",
    "Cannabis Medicine",
    "General Practice"
  ] },
  { groupKey: "set.profGroup.psychology", options: [
    "Psychologist",
    "Psychoanalyst",
    "Neuropsychologist",
    "Psychotherapist",
    "Behavioral Therapist"
  ] },
  { groupKey: "set.profGroup.nutrition", options: ["Nutritionist", "Dietitian", "Sports Nutritionist"] },
  { groupKey: "set.profGroup.rehab", options: [
    "Physiotherapist",
    "Occupational Therapist",
    "Speech Therapist (Speech-Language Pathologist)",
    "Osteopath",
    "Chiropractor"
  ] },
  { groupKey: "set.profGroup.nursing", options: ["Nurse", "Nurse Practitioner", "Midwife", "Obstetric Nurse"] },
  { groupKey: "set.profGroup.dentistry", options: [
    "Dentist (General)",
    "Orthodontist",
    "Endodontist",
    "Periodontist",
    "Oral and Maxillofacial Surgeon",
    "Pediatric Dentist"
  ] },
  { groupKey: "set.profGroup.other", options: [
    "Pharmacist",
    "Biomedical Scientist",
    "Physical Educator / Personal Trainer",
    "Social Worker (Health)",
    "Optometrist",
    "Podiatrist",
    "Acupuncturist (non-medical)",
    "Naturopath",
    "Veterinarian",
    "Other"
  ] }
];
var LABELS = {
  "Acupuncture": { en: "Acupuncture", pt: "Acupuntura", es: "Acupuntura" },
  "Allergy and Immunology": { en: "Allergy and Immunology", pt: "Alergia e Imunologia", es: "Alergia e Inmunolog\xEDa" },
  "Anesthesiology": { en: "Anesthesiology", pt: "Anestesiologia", es: "Anestesiolog\xEDa" },
  "Angiology": { en: "Angiology", pt: "Angiologia", es: "Angiolog\xEDa" },
  "Cardiology": { en: "Cardiology", pt: "Cardiologia", es: "Cardiolog\xEDa" },
  "Cardiovascular Surgery": { en: "Cardiovascular Surgery", pt: "Cirurgia Cardiovascular", es: "Cirug\xEDa Cardiovascular" },
  "Hand Surgery": { en: "Hand Surgery", pt: "Cirurgia da M\xE3o", es: "Cirug\xEDa de la Mano" },
  "Head and Neck Surgery": { en: "Head and Neck Surgery", pt: "Cirurgia de Cabe\xE7a e Pesco\xE7o", es: "Cirug\xEDa de Cabeza y Cuello" },
  "Digestive System Surgery": { en: "Digestive System Surgery", pt: "Cirurgia do Aparelho Digestivo", es: "Cirug\xEDa del Aparato Digestivo" },
  "General Surgery": { en: "General Surgery", pt: "Cirurgia Geral", es: "Cirug\xEDa General" },
  "Pediatric Surgery": { en: "Pediatric Surgery", pt: "Cirurgia Pedi\xE1trica", es: "Cirug\xEDa Pedi\xE1trica" },
  "Plastic Surgery": { en: "Plastic Surgery", pt: "Cirurgia Pl\xE1stica", es: "Cirug\xEDa Pl\xE1stica" },
  "Thoracic Surgery": { en: "Thoracic Surgery", pt: "Cirurgia Tor\xE1cica", es: "Cirug\xEDa Tor\xE1cica" },
  "Vascular Surgery": { en: "Vascular Surgery", pt: "Cirurgia Vascular", es: "Cirug\xEDa Vascular" },
  "Internal Medicine": { en: "Internal Medicine", pt: "Cl\xEDnica M\xE9dica", es: "Medicina Interna" },
  "Coloproctology": { en: "Coloproctology", pt: "Coloproctologia", es: "Coloproctolog\xEDa" },
  "Dermatology": { en: "Dermatology", pt: "Dermatologia", es: "Dermatolog\xEDa" },
  "Endocrinology and Metabolism": { en: "Endocrinology and Metabolism", pt: "Endocrinologia e Metabologia", es: "Endocrinolog\xEDa y Metabolismo" },
  "Endoscopy": { en: "Endoscopy", pt: "Endoscopia", es: "Endoscopia" },
  "Gastroenterology": { en: "Gastroenterology", pt: "Gastroenterologia", es: "Gastroenterolog\xEDa" },
  "Medical Genetics": { en: "Medical Genetics", pt: "Gen\xE9tica M\xE9dica", es: "Gen\xE9tica M\xE9dica" },
  "Geriatrics": { en: "Geriatrics", pt: "Geriatria", es: "Geriatr\xEDa" },
  "Gynecology and Obstetrics": { en: "Gynecology and Obstetrics", pt: "Ginecologia e Obstetr\xEDcia", es: "Ginecolog\xEDa y Obstetricia" },
  "Hematology and Hemotherapy": { en: "Hematology and Hemotherapy", pt: "Hematologia e Hemoterapia", es: "Hematolog\xEDa y Hemoterapia" },
  "Homeopathy": { en: "Homeopathy", pt: "Homeopatia", es: "Homeopat\xEDa" },
  "Infectious Diseases": { en: "Infectious Diseases", pt: "Infectologia", es: "Enfermedades Infecciosas" },
  "Mastology": { en: "Mastology", pt: "Mastologia", es: "Mastolog\xEDa" },
  "Family and Community Medicine": { en: "Family and Community Medicine", pt: "Medicina de Fam\xEDlia e Comunidade", es: "Medicina Familiar y Comunitaria" },
  "Physical Medicine and Rehabilitation": { en: "Physical Medicine and Rehabilitation", pt: "Medicina F\xEDsica e Reabilita\xE7\xE3o", es: "Medicina F\xEDsica y Rehabilitaci\xF3n" },
  "Occupational Medicine": { en: "Occupational Medicine", pt: "Medicina do Trabalho", es: "Medicina del Trabajo" },
  "Sports Medicine": { en: "Sports Medicine", pt: "Medicina Esportiva", es: "Medicina Deportiva" },
  "Emergency Medicine": { en: "Emergency Medicine", pt: "Medicina de Emerg\xEAncia", es: "Medicina de Emergencia" },
  "Legal Medicine and Forensics": { en: "Legal Medicine and Forensics", pt: "Medicina Legal e Forense", es: "Medicina Legal y Forense" },
  "Nuclear Medicine": { en: "Nuclear Medicine", pt: "Medicina Nuclear", es: "Medicina Nuclear" },
  "Intensive Care Medicine": { en: "Intensive Care Medicine", pt: "Medicina Intensiva", es: "Medicina Intensiva" },
  "Preventive and Social Medicine": { en: "Preventive and Social Medicine", pt: "Medicina Preventiva e Social", es: "Medicina Preventiva y Social" },
  "Nephrology": { en: "Nephrology", pt: "Nefrologia", es: "Nefrolog\xEDa" },
  "Neurosurgery": { en: "Neurosurgery", pt: "Neurocirurgia", es: "Neurocirug\xEDa" },
  "Neurology": { en: "Neurology", pt: "Neurologia", es: "Neurolog\xEDa" },
  "Nutrology": { en: "Nutrology", pt: "Nutrologia", es: "Nutrolog\xEDa" },
  "Ophthalmology": { en: "Ophthalmology", pt: "Oftalmologia", es: "Oftalmolog\xEDa" },
  "Oncology": { en: "Oncology", pt: "Oncologia", es: "Oncolog\xEDa" },
  "Orthopedics and Traumatology": { en: "Orthopedics and Traumatology", pt: "Ortopedia e Traumatologia", es: "Ortopedia y Traumatolog\xEDa" },
  "Otorhinolaryngology (ENT)": { en: "Otorhinolaryngology (ENT)", pt: "Otorrinolaringologia", es: "Otorrinolaringolog\xEDa" },
  "Pathology": { en: "Pathology", pt: "Patologia", es: "Patolog\xEDa" },
  "Clinical Pathology / Laboratory Medicine": { en: "Clinical Pathology / Laboratory Medicine", pt: "Patologia Cl\xEDnica / Medicina Laboratorial", es: "Patolog\xEDa Cl\xEDnica / Medicina de Laboratorio" },
  "Pediatrics": { en: "Pediatrics", pt: "Pediatria", es: "Pediatr\xEDa" },
  "Pneumology": { en: "Pneumology", pt: "Pneumologia", es: "Neumolog\xEDa" },
  "Psychiatry": { en: "Psychiatry", pt: "Psiquiatria", es: "Psiquiatr\xEDa" },
  "Radiology and Diagnostic Imaging": { en: "Radiology and Diagnostic Imaging", pt: "Radiologia e Diagn\xF3stico por Imagem", es: "Radiolog\xEDa e Imagen Diagn\xF3stica" },
  "Radiotherapy": { en: "Radiotherapy", pt: "Radioterapia", es: "Radioterapia" },
  "Rheumatology": { en: "Rheumatology", pt: "Reumatologia", es: "Reumatolog\xEDa" },
  "Urology": { en: "Urology", pt: "Urologia", es: "Urolog\xEDa" },
  "Cannabis Medicine": { en: "Cannabis Medicine", pt: "Cannabis Medicinal", es: "Cannabis Medicinal" },
  "General Practice": { en: "General Practice", pt: "Cl\xEDnico Geral", es: "Medicina General" },
  "Psychology": { en: "Psychology", pt: "Psicologia", es: "Psicolog\xEDa" },
  "Nutrition": { en: "Nutrition", pt: "Nutri\xE7\xE3o", es: "Nutrici\xF3n" },
  "Psychologist": { en: "Psychologist", pt: "Psic\xF3logo", es: "Psic\xF3logo" },
  "Psychoanalyst": { en: "Psychoanalyst", pt: "Psicanalista", es: "Psicoanalista" },
  "Neuropsychologist": { en: "Neuropsychologist", pt: "Neuropsic\xF3logo", es: "Neuropsic\xF3logo" },
  "Psychotherapist": { en: "Psychotherapist", pt: "Psicoterapeuta", es: "Psicoterapeuta" },
  "Behavioral Therapist": { en: "Behavioral Therapist", pt: "Terapeuta Comportamental", es: "Terapeuta Conductual" },
  "Nutritionist": { en: "Nutritionist", pt: "Nutricionista", es: "Nutricionista" },
  "Dietitian": { en: "Dietitian", pt: "Dietista", es: "Dietista" },
  "Sports Nutritionist": { en: "Sports Nutritionist", pt: "Nutricionista Esportivo", es: "Nutricionista Deportivo" },
  "Physiotherapist": { en: "Physiotherapist", pt: "Fisioterapeuta", es: "Fisioterapeuta" },
  "Occupational Therapist": { en: "Occupational Therapist", pt: "Terapeuta Ocupacional", es: "Terapeuta Ocupacional" },
  "Speech Therapist (Speech-Language Pathologist)": { en: "Speech Therapist (Speech-Language Pathologist)", pt: "Fonoaudi\xF3logo", es: "Logopeda" },
  "Osteopath": { en: "Osteopath", pt: "Osteopata", es: "Oste\xF3pata" },
  "Chiropractor": { en: "Chiropractor", pt: "Quiropraxista", es: "Quiropr\xE1ctico" },
  "Nurse": { en: "Nurse", pt: "Enfermeiro", es: "Enfermero" },
  "Nurse Practitioner": { en: "Nurse Practitioner", pt: "Enfermeiro Especialista", es: "Enfermero Especialista" },
  "Midwife": { en: "Midwife", pt: "Parteira", es: "Partera" },
  "Obstetric Nurse": { en: "Obstetric Nurse", pt: "Enfermeiro Obst\xE9trico", es: "Enfermero Obst\xE9trico" },
  "Dentist (General)": { en: "Dentist (General)", pt: "Dentista (Geral)", es: "Dentista (General)" },
  "Orthodontist": { en: "Orthodontist", pt: "Ortodontista", es: "Ortodoncista" },
  "Endodontist": { en: "Endodontist", pt: "Endodontista", es: "Endodoncista" },
  "Periodontist": { en: "Periodontist", pt: "Periodontista", es: "Periodoncista" },
  "Oral and Maxillofacial Surgeon": { en: "Oral and Maxillofacial Surgeon", pt: "Cirurgi\xE3o Bucomaxilofacial", es: "Cirujano Bucomaxilofacial" },
  "Pediatric Dentist": { en: "Pediatric Dentist", pt: "Dentista Pedi\xE1trico", es: "Dentista Pedi\xE1trico" },
  "Pharmacist": { en: "Pharmacist", pt: "Farmac\xEAutico", es: "Farmac\xE9utico" },
  "Biomedical Scientist": { en: "Biomedical Scientist", pt: "Biom\xE9dico", es: "Cient\xEDfico Biom\xE9dico" },
  "Physical Educator / Personal Trainer": { en: "Physical Educator / Personal Trainer", pt: "Educador F\xEDsico / Personal Trainer", es: "Educador F\xEDsico / Entrenador Personal" },
  "Social Worker (Health)": { en: "Social Worker (Health)", pt: "Assistente Social (Sa\xFAde)", es: "Trabajador Social (Salud)" },
  "Optometrist": { en: "Optometrist", pt: "Optometrista", es: "Optometrista" },
  "Podiatrist": { en: "Podiatrist", pt: "Pod\xF3logo", es: "Pod\xF3logo" },
  "Acupuncturist (non-medical)": { en: "Acupuncturist (non-medical)", pt: "Acupunturista (n\xE3o m\xE9dico)", es: "Acupunturista (no m\xE9dico)" },
  "Naturopath": { en: "Naturopath", pt: "Naturopata", es: "Naturopata" },
  "Veterinarian": { en: "Veterinarian", pt: "Veterin\xE1rio", es: "Veterinario" },
  "Other": { en: "Other", pt: "Outro", es: "Otro" },
  [PSYCHOANALYSIS_SPECIALTY]: { en: "Psychoanalysis", pt: "Psican\xE1lise", es: "Psicoan\xE1lisis" }
};
var ALL_PROFESSION_VALUES = PROFESSION_GROUPS.flatMap((g) => g.options);

// src/lib/psychoanalyst-api.ts
import { NextResponse } from "next/server";
init_db();
init_encryption();
function safeDecrypt(v) {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

// src/lib/providers.ts
async function getUnifiedProvider(id, providerType) {
  if (providerType === "health") {
    const p2 = await db.professionalProfile.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        consultPrice: true,
        currency: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        clinicCity: true,
        clinicState: true,
        clinicCountry: true,
        clinicAddress: true,
        clinicZip: true,
        clinicLatitude: true,
        clinicLongitude: true,
        licenseNumber: true,
        licenseState: true,
        verified: true,
        virtualCard: { select: { slug: true } },
        acuraVolunteer: true
      }
    });
    if (!p2) return null;
    const info = getProfessionInfo(p2.specialty);
    return {
      id: p2.id,
      providerType: "health",
      firstName: p2.firstName,
      lastName: p2.lastName,
      specialty: p2.specialty,
      bio: p2.bio,
      avatarUrl: p2.avatarUrl,
      consultPrice: p2.consultPrice,
      currency: p2.currency,
      acceptsTeleconsult: p2.acceptsTeleconsult,
      acceptsInPerson: p2.acceptsInPerson,
      clinicCity: p2.clinicCity,
      clinicState: p2.clinicState,
      clinicCountry: p2.clinicCountry,
      clinicAddress: p2.clinicAddress,
      clinicZip: p2.clinicZip,
      clinicLatitude: p2.clinicLatitude,
      clinicLongitude: p2.clinicLongitude,
      license: formatLicense(p2.licenseNumber, p2.licenseState, info.councilKey) || null,
      trainingInstitution: null,
      yearsOfPractice: null,
      associations: [],
      verified: p2.verified,
      sessionDurationMins: 30,
      virtualCardSlug: p2.virtualCard?.slug ?? null,
      acuraVolunteer: p2.acuraVolunteer
    };
  }
  const p = await db.psychoanalystProfile.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,
      consultPrice: true,
      currency: true,
      acceptsTeleconsult: true,
      acceptsInPerson: true,
      clinicCity: true,
      clinicState: true,
      clinicCountry: true,
      clinicAddress: true,
      clinicZip: true,
      clinicLatitude: true,
      clinicLongitude: true,
      trainingInstitution: true,
      yearsOfPractice: true,
      associations: true,
      verified: true,
      sessionDurationMins: true,
      acuraVolunteer: true
    }
  });
  if (!p) return null;
  return {
    id: p.id,
    providerType: "psychoanalyst",
    firstName: safeDecrypt(p.firstName),
    lastName: safeDecrypt(p.lastName),
    specialty: PSYCHOANALYSIS_SPECIALTY,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    consultPrice: p.consultPrice,
    currency: p.currency,
    acceptsTeleconsult: p.acceptsTeleconsult,
    acceptsInPerson: p.acceptsInPerson,
    clinicCity: p.clinicCity,
    clinicState: p.clinicState,
    clinicCountry: p.clinicCountry,
    clinicAddress: p.clinicAddress,
    clinicZip: p.clinicZip,
    clinicLatitude: p.clinicLatitude,
    clinicLongitude: p.clinicLongitude,
    license: null,
    trainingInstitution: p.trainingInstitution,
    yearsOfPractice: p.yearsOfPractice,
    associations: p.associations,
    verified: p.verified,
    sessionDurationMins: p.sessionDurationMins,
    virtualCardSlug: null,
    acuraVolunteer: p.acuraVolunteer
  };
}

// src/lib/volunteer-slot-booking.ts
init_db();

// src/lib/timezone.ts
var DEFAULT_TIME_ZONE = "America/Sao_Paulo";
function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const timeParts = timeStr.split(":").map(Number);
  const h = timeParts[0] ?? 0;
  const mi = timeParts[1] ?? 0;
  const s = timeParts[2] ?? 0;
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(y, mo - 1, d, h, mi, s) - offset;
  }
  return new Date(utcMs);
}
function calendarDateInTimeZone(instant, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(instant);
}
function dayOfWeekForDateStr(dateStr, timeZone) {
  const instant = zonedTimeToUtc(dateStr, "12:00", timeZone);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(instant);
  const map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return map[short] ?? 0;
}

// src/lib/scheduling.ts
function timeToMins(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function generateSlotsInRange(startTime, endTime, consultationMins, gapMins = 0) {
  const startMins = timeToMins(startTime);
  const endMins = timeToMins(endTime);
  if (consultationMins <= 0 || endMins <= startMins) return [];
  const slots = [];
  let current = startMins;
  while (current + consultationMins <= endMins) {
    slots.push({
      startTime: minsToTime(current),
      endTime: minsToTime(current + consultationMins)
    });
    current += consultationMins + gapMins;
  }
  return slots;
}
function generateTimeSlots(dateStr, timeZone, blocks, bookedTimes, now, isSlotBlocked) {
  const slots = [];
  for (const block of blocks) {
    const gap = block.slotGapMins ?? 0;
    const generated = generateSlotsInRange(
      block.startTime,
      block.endTime,
      block.slotDurationMins,
      gap
    );
    const isVolunteer = !!block.isVolunteer;
    for (const slot of generated) {
      const slotDate = zonedTimeToUtc(dateStr, slot.startTime, timeZone);
      const isPast = slotDate.getTime() < now.getTime() + 60 * 60 * 1e3;
      const isBooked = bookedTimes.has(slotDate.toISOString());
      const isBlocked = isSlotBlocked?.(dateStr, slot.startTime) ?? false;
      slots.push({
        time: slot.startTime,
        datetime: slotDate.toISOString(),
        available: !isPast && !isBooked && !isBlocked,
        volunteerOnly: !!block.volunteerOnly,
        isVolunteer,
        ...isVolunteer ? { priceCents: 0 } : {}
      });
    }
  }
  return slots.sort((a, b) => a.datetime.localeCompare(b.datetime));
}

// src/lib/availability-exceptions.ts
function normalizeVolunteerBlock(b) {
  return {
    id: b.id,
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
    slotDuration: b.slotDuration ?? 30,
    slotGap: b.slotGap ?? 0
  };
}
function parseAvailabilityJson(raw) {
  if (!raw || typeof raw !== "object") return { dateBlocks: [], volunteerBlocks: [] };
  const obj = raw;
  const blocks = Array.isArray(obj.dateBlocks) ? obj.dateBlocks : [];
  const volunteerRaw = Array.isArray(obj.volunteerBlocks) ? obj.volunteerBlocks : [];
  return {
    dateBlocks: blocks.filter((b) => {
      if (!b || typeof b !== "object") return false;
      const block = b;
      return typeof block.id === "string" && typeof block.startDate === "string";
    }).map((b) => ({
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate || b.startDate,
      startTime: b.startTime || void 0,
      endTime: b.endTime || void 0,
      label: b.label || void 0
    })),
    volunteerBlocks: volunteerRaw.filter((b) => {
      if (!b || typeof b !== "object") return false;
      const block = b;
      return typeof block.id === "string" && typeof block.dayOfWeek === "number" && typeof block.startTime === "string" && typeof block.endTime === "string";
    }).map(normalizeVolunteerBlock)
  };
}

// src/lib/volunteer-slot-booking.ts
async function resolveSlotAtDateTime(providerId, providerType, scheduledAtIso) {
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  const blocks = await loadAvailabilityBlocks(providerId, providerType);
  if (blocks.length === 0) return null;
  const timeZone = await loadProviderTimeZone(providerId, providerType);
  const dateStr = calendarDateInTimeZone(scheduledAt, timeZone);
  const dayOfWeek = dayOfWeekForDateStr(dateStr, timeZone);
  const blocksForDay = blocks.filter((b) => b.dayOfWeek === dayOfWeek);
  if (blocksForDay.length === 0) return null;
  const now = /* @__PURE__ */ new Date();
  const bookedTimes = await loadBookedTimes(providerId, providerType, now);
  const slots = generateTimeSlots(dateStr, timeZone, blocksForDay, bookedTimes, now);
  const target = scheduledAt.toISOString();
  const match = slots.find((s) => s.datetime === target);
  if (!match) return null;
  return {
    available: match.available,
    volunteerOnly: match.volunteerOnly,
    isVolunteer: match.isVolunteer,
    priceCents: match.priceCents
  };
}
async function assertPaidSlotBooking(providerId, providerType, scheduledAtIso) {
  const slot = await resolveSlotAtDateTime(providerId, providerType, scheduledAtIso);
  if (slot?.isVolunteer && slot.available) {
    throw new VolunteerSlotBookingError("scheduled_volunteer_slot_requires_free_booking");
  }
  if (slot?.volunteerOnly && slot.available) {
    throw new VolunteerSlotBookingError("volunteer_slot_requires_free_booking");
  }
}
var VolunteerSlotBookingError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "VolunteerSlotBookingError";
  }
};
async function loadProviderTimeZone(providerId, providerType) {
  if (providerType === "psychoanalyst") {
    const row2 = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      include: { user: true }
    });
    return row2?.user?.timezone || DEFAULT_TIME_ZONE;
  }
  if (providerType === "integrative") {
    const row2 = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      include: { user: true }
    });
    return row2?.user?.timezone || DEFAULT_TIME_ZONE;
  }
  const row = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { timezone: true }
  });
  return row?.timezone || DEFAULT_TIME_ZONE;
}
async function loadAvailabilityBlocks(providerId, providerType) {
  if (providerType === "psychoanalyst") {
    const rows2 = await db.psychoanalystAvailabilitySlot.findMany({
      where: { psychoanalystId: providerId, isActive: true }
    });
    const paid2 = rows2.filter((r) => !r.volunteerOnly).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMins: r.slotDurationMins,
      slotGapMins: r.slotGapMins,
      volunteerOnly: r.volunteerOnly,
      isVolunteer: false
    }));
    const volunteer2 = rows2.filter((r) => r.volunteerOnly).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMins: r.slotDurationMins,
      slotGapMins: r.slotGapMins,
      volunteerOnly: false,
      isVolunteer: true
    }));
    return [...paid2, ...volunteer2];
  }
  if (providerType === "integrative") {
    const profile2 = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      select: { availability: true }
    });
    const volunteerBlocks2 = parseAvailabilityJson(profile2?.availability).volunteerBlocks ?? [];
    const rows2 = await db.integrativeTherapistAvailabilitySlot.findMany({
      where: { integrativeTherapistId: providerId, isActive: true }
    });
    const paid2 = rows2.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMins: r.slotDurationMins,
      slotGapMins: r.slotGapMins,
      volunteerOnly: false,
      isVolunteer: false
    }));
    const volunteer2 = volunteerBlocks2.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      slotDurationMins: b.slotDuration ?? 30,
      slotGapMins: b.slotGap ?? 0,
      volunteerOnly: false,
      isVolunteer: true
    }));
    return [...paid2, ...volunteer2];
  }
  const profile = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { availability: true }
  });
  const volunteerBlocks = parseAvailabilityJson(profile?.availability).volunteerBlocks ?? [];
  const rows = await db.availabilitySlot.findMany({
    where: { professionalId: providerId, isActive: true }
  });
  const paid = rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMins: r.slotDurationMins,
    slotGapMins: r.slotGapMins,
    volunteerOnly: r.volunteerOnly,
    isVolunteer: false
  }));
  const volunteer = volunteerBlocks.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
    slotDurationMins: b.slotDuration ?? 30,
    slotGapMins: b.slotGap ?? 0,
    volunteerOnly: false,
    isVolunteer: true
  }));
  return [...paid, ...volunteer];
}
async function loadBookedTimes(providerId, providerType, now) {
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1e3);
  const providerFilter = providerType === "psychoanalyst" ? { psychoanalystId: providerId } : providerType === "integrative" ? { integrativeTherapistId: providerId } : { professionalId: providerId };
  const booked = await db.appointment.findMany({
    where: {
      ...providerFilter,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: twoWeeksLater }
    },
    select: { scheduledAt: true }
  });
  return new Set(booked.map((a) => a.scheduledAt.toISOString()));
}

// src/lib/stripe-payment-methods.ts
function getConsultationPaymentMethodTypes(currency, preferred) {
  const cur = currency.toLowerCase();
  if (cur !== "brl") return ["card"];
  if (preferred === "card") return ["card"];
  if (preferred === "pix") return ["pix"];
  if (preferred === "boleto") return ["boleto"];
  return ["card", "pix", "boleto"];
}
function needsBrazilTaxId(currency) {
  return currency.toLowerCase() === "brl";
}

// src/lib/registration-regions.ts
var REGISTRATION_REGION_GROUPS = [
  {
    key: "north_america",
    labelKey: "reg.regionGroupNorthAmerica",
    codes: ["US", "CA", "MX"]
  },
  {
    key: "central_america",
    labelKey: "reg.regionGroupCentralAmerica",
    codes: ["BZ", "CR", "SV", "GT", "HN", "NI", "PA"]
  },
  {
    key: "caribbean",
    labelKey: "reg.regionGroupCaribbean",
    codes: ["AG", "BS", "BB", "CU", "DM", "DO", "GD", "HT", "JM", "KN", "LC", "VC", "TT"]
  },
  {
    key: "south_america",
    labelKey: "reg.regionGroupSouthAmerica",
    codes: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"]
  },
  {
    key: "europe",
    labelKey: "reg.regionGroupEurope",
    codes: ["EU"]
  }
];
var REGISTRATION_REGION_CODES = REGISTRATION_REGION_GROUPS.flatMap(
  (g) => g.codes
);
var REGISTRATION_REGION_SET = new Set(REGISTRATION_REGION_CODES);
function isValidRegistrationRegion(value) {
  return typeof value === "string" && REGISTRATION_REGION_SET.has(value);
}
function toBillingRegion(code) {
  if (code === "BR") return "BR";
  if (code === "VE") return "VE";
  if (code === "EU") return "EU";
  if (code === "US") return "US";
  if (isValidRegistrationRegion(code)) return "US";
  return "US";
}

// src/lib/billing-regions.ts
function parseBillingRegion(value, fallback = "US") {
  if (value === "BR" || value === "US" || value === "EU" || value === "VE") return value;
  if (typeof value === "string" && isValidRegistrationRegion(value)) return toBillingRegion(value);
  return fallback;
}
function normalizeCurrency(code) {
  return code.trim().toUpperCase();
}
function defaultCurrencyForBillingRegion(region) {
  switch (parseBillingRegion(region ?? void 0)) {
    case "BR":
      return "BRL";
    case "EU":
      return "EUR";
    default:
      return "USD";
  }
}
function resolveProviderCurrency(profileCurrency, providerRegion) {
  if (profileCurrency?.trim()) return normalizeCurrency(profileCurrency);
  return defaultCurrencyForBillingRegion(providerRegion);
}
function toStripeCurrency(code) {
  return normalizeCurrency(code).toLowerCase();
}

// src/app/api/payments/checkout-consultation/route.ts
import { z as z2 } from "zod";
var schema = z2.object({
  professionalId: z2.string().optional(),
  psychoanalystId: z2.string().optional(),
  providerType: z2.enum(["health", "psychoanalyst"]).default("health"),
  scheduledAt: z2.string().datetime(),
  type: z2.enum(["TELECONSULT", "IN_PERSON"]),
  paymentMethod: z2.enum(["card", "pix", "boleto", "all"]).default("all"),
  serviceId: z2.string().optional(),
  serviceName: z2.string().optional(),
  visitReason: z2.string().max(2e3).optional(),
  healthPlanSlug: z2.string().max(80).optional(),
  healthPlanLabel: z2.string().max(120).optional(),
  acceptedCancellationPolicy: z2.boolean(),
  bookingSource: z2.enum(["patient_panel", "public_profile", "public_search", "public_embed", "referral"]).optional()
});
var RETURN_NOT_ELIGIBLE_MESSAGE = "Retorno dispon\xEDvel apenas para pacientes com consulta conclu\xEDda com este profissional nos \xFAltimos 30 dias.";
async function getProviderUserRegion(providerId, providerType) {
  if (providerType === "psychoanalyst") {
    const row2 = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      select: { user: { select: { region: true } } }
    });
    return row2?.user?.region ?? null;
  }
  const row = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { user: { select: { region: true } } }
  });
  return row?.user?.region ?? null;
}
async function POST(req) {
  const session = await auth();
  if (!session?.user) return NextResponse2.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse2.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse2.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!parsed.data.acceptedCancellationPolicy) {
    return NextResponse2.json(
      { error: { general: ["Cancellation policy must be accepted."] } },
      { status: 400 }
    );
  }
  const { scheduledAt, type, providerType, paymentMethod } = parsed.data;
  const providerId = providerType === "psychoanalyst" ? parsed.data.psychoanalystId || parsed.data.professionalId : parsed.data.professionalId || parsed.data.psychoanalystId;
  if (!providerId) {
    return NextResponse2.json({ error: "Provider id required" }, { status: 400 });
  }
  const provider = await getUnifiedProvider(providerId, providerType);
  if (!provider) return NextResponse2.json({ error: "Professional not found" }, { status: 404 });
  try {
    await assertPaidSlotBooking(providerId, providerType, scheduledAt);
  } catch (e) {
    if (e instanceof VolunteerSlotBookingError && e.code === "volunteer_slot_requires_free_booking") {
      return NextResponse2.json(
        { error: { general: ["This volunteer slot is free \u2014 use volunteer booking instead of payment."] } },
        { status: 400 }
      );
    }
    throw e;
  }
  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true }
  });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, region: true }
  });
  if (!patient || !user) return NextResponse2.json({ error: "User not found" }, { status: 404 });
  const providerRegion = await getProviderUserRegion(providerId, providerType);
  const providerCurrency = resolveProviderCurrency(provider.currency, providerRegion);
  let amount = provider.consultPrice;
  let chargeCurrency = providerCurrency;
  if (parsed.data.serviceId) {
    const svc = await db.providerService.findFirst({
      where: {
        id: parsed.data.serviceId,
        isActive: true,
        ...providerType === "psychoanalyst" ? { psychoanalystId: providerId } : { professionalId: providerId }
      },
      select: { priceCents: true, currency: true, isReturnService: true }
    });
    if (svc?.isReturnService) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const providerFilter = providerType === "psychoanalyst" ? { psychoanalystId: providerId } : providerType === "integrative" ? { integrativeTherapistId: providerId } : { professionalId: providerId };
      const priorCompleted = await db.appointment.findFirst({
        where: {
          patient: { userId: session.user.id },
          status: "COMPLETED",
          scheduledAt: { gte: thirtyDaysAgo },
          ...providerFilter
        },
        select: { id: true }
      });
      if (!priorCompleted) {
        return NextResponse2.json(
          { error: "RETURN_NOT_ELIGIBLE", message: RETURN_NOT_ELIGIBLE_MESSAGE },
          { status: 403 }
        );
      }
    }
    if (svc?.priceCents != null) amount = svc.priceCents;
    if (svc?.currency) chargeCurrency = normalizeCurrency(svc.currency);
  }
  if (chargeCurrency !== providerCurrency) {
    return NextResponse2.json(
      {
        error: "CURRENCY_MISMATCH",
        providerCurrency,
        requested: chargeCurrency
      },
      { status: 409 }
    );
  }
  const currency = toStripeCurrency(chargeCurrency);
  if (currency !== "brl") {
    return NextResponse2.json(
      { error: "Hosted checkout with PIX/boleto is only available for BRL." },
      { status: 400 }
    );
  }
  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );
  const providerName = `${provider.firstName} ${provider.lastName}`;
  const metaKey = providerType === "psychoanalyst" ? "psychoanalystId" : "professionalId";
  const durationMins = providerType === "psychoanalyst" && "sessionDurationMins" in provider ? String(provider.sessionDurationMins) : "30";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const methodTypes = getConsultationPaymentMethodTypes(
    currency,
    paymentMethod
  );
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: methodTypes,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Consulta Doctor8 - ${providerName}`,
            description: `${new Date(scheduledAt).toLocaleString("pt-BR")} - ${type}`
          }
        },
        quantity: 1
      }
    ],
    success_url: `${appUrl}/patient/appointments?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/patient/appointments?checkout=cancelled`,
    metadata: {
      kind: "consultation",
      userId: session.user.id,
      providerType,
      [metaKey]: providerId,
      scheduledAt,
      type,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: providerName,
      providerSpecialty: provider.specialty,
      durationMins,
      visitReason: parsed.data.visitReason?.trim() || "",
      healthPlanSlug: parsed.data.healthPlanSlug || "particular",
      healthPlanLabel: parsed.data.healthPlanLabel || "Particular",
      serviceId: parsed.data.serviceId || "",
      serviceName: parsed.data.serviceName || "",
      acceptedCancellationPolicy: String(parsed.data.acceptedCancellationPolicy),
      bookingSource: parsed.data.bookingSource || "patient_panel"
    },
    ...needsBrazilTaxId(currency) ? {
      tax_id_collection: { enabled: true },
      billing_address_collection: "required"
    } : {}
  });
  return NextResponse2.json({ checkoutUrl: checkoutSession.url });
}
export {
  POST
};
