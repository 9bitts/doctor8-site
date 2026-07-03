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

// src/app/api/admin/rateio/cost-attachment/route.ts
import { NextResponse } from "next/server";
import { S3Client as S3Client2, PutObjectCommand as PutObjectCommand2 } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrl2 } from "@aws-sdk/s3-request-presigner";

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

// src/lib/admin.ts
async function getAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

// src/lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes as randomBytes2 } from "crypto";
var REGION = process.env.AWS_REGION || "eu-north-1";
var BUCKET = process.env.AWS_S3_BUCKET || "";
var _client = null;
function client() {
  if (!_client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials are not set");
    }
    _client = new S3Client({
      region: REGION,
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return _client;
}
var MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
function buildKey(folder, originalName) {
  const ext = (originalName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = randomBytes2(16).toString("hex");
  const safeFolder = folder.split("/").map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "")).filter(Boolean).join("/");
  return `${safeFolder}/${id}.${ext}`;
}
async function getSignedReadUrl(key, expiresInSeconds = 900) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

// src/app/api/admin/rateio/cost-attachment/route.ts
var runtime = "nodejs";
var dynamic = "force-dynamic";
var ALLOWED_CONTENT_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "application/pdf"
]);
var MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
var RECEIPT_PREFIX = "rateio-receipts/";
var _client2 = null;
function s3Client() {
  if (!_client2) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials are not set");
    }
    _client2 = new S3Client2({
      region: process.env.AWS_REGION || "eu-north-1",
      credentials: { accessKeyId, secretAccessKey }
    });
  }
  return _client2;
}
function defaultMonth() {
  const n = /* @__PURE__ */ new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
async function presignedPutUrl(key, contentType) {
  const bucket = process.env.AWS_S3_BUCKET || "";
  return getSignedUrl2(
    s3Client(),
    new PutObjectCommand2({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    }),
    { expiresIn: 900 }
  );
}
async function GET(req) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key || !key.startsWith(RECEIPT_PREFIX)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  try {
    const viewUrl = await getSignedReadUrl(key, 300);
    return NextResponse.json({ viewUrl });
  } catch (e) {
    console.error("[RATEIO-ATTACHMENT-VIEW]", e);
    return NextResponse.json({ error: "Failed to generate view URL" }, { status: 500 });
  }
}
async function POST(req) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : defaultMonth();
  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "contentType must be image/jpeg, image/png, or application/pdf" },
      { status: 400 }
    );
  }
  const declaredSize = Number(body.sizeBytes);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }
  try {
    const key = buildKey(`${RECEIPT_PREFIX}${month}`, filename);
    const uploadUrl = await presignedPutUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key, maxBytes: MAX_ATTACHMENT_BYTES });
  } catch (e) {
    console.error("[RATEIO-ATTACHMENT-UPLOAD]", e);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
export {
  GET,
  MAX_ATTACHMENT_BYTES,
  POST,
  dynamic,
  runtime
};
