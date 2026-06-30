import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, ConsentType } from "@prisma/client";
import { REGISTRATION_REGION_CODES, requiresGdpr } from "@/lib/registration-regions";
import { sendEmailVerification } from "@/lib/email";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { encrypt } from "@/lib/encryption";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { buildKey, uploadToS3 } from "@/lib/s3";
import {
  LICENSE_DOC_MIME,
  licenseDocsFolder,
  MAX_LICENSE_DOC_BYTES,
} from "@/lib/provider-license-docs";
import { notifyAdminLicenseDocumentUploaded } from "@/lib/provider-license-notify";

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

const registerAngelSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  region: z.enum(REGISTRATION_REGION_CODES as [typeof REGISTRATION_REGION_CODES[number], ...typeof REGISTRATION_REGION_CODES[number][]]).default("BR"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(8).max(30),
  profession: z.string().min(1).max(120),
  volunteerHelp: z.string().min(1).max(2000),
  languages: z.array(z.enum(["pt", "en", "es"])).min(1),
  motivation: z.string().max(2000).optional(),
  campaignSlug: z.string().optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.boolean().optional(),
});

async function parseRegisterBody(req: NextRequest): Promise<{
  data: z.infer<typeof registerAngelSchema> | null;
  certificate: File | null;
  fieldErrors: Record<string, string[]> | null;
}> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const languagesRaw = form.get("languages");
    let languages: string[] = [];
    try {
      languages = JSON.parse(String(languagesRaw || "[]"));
    } catch {
      return { data: null, certificate: null, fieldErrors: { languages: ["Invalid languages"] } };
    }

    const parsed = registerAngelSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      region: form.get("region") || "BR",
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      phone: form.get("phone"),
      profession: form.get("profession"),
      volunteerHelp: form.get("volunteerHelp"),
      languages,
      motivation: form.get("motivation") || undefined,
      campaignSlug: form.get("campaignSlug") || undefined,
      language: form.get("language") || undefined,
      acceptedTerms: form.get("acceptedTerms") === "true",
      acceptedPrivacy: form.get("acceptedPrivacy") === "true",
      acceptedGdpr: form.get("acceptedGdpr") === "true",
    });

    const certificate = form.get("certificate");
    const certFile = certificate instanceof File && certificate.size > 0 ? certificate : null;

    if (!parsed.success) {
      return { data: null, certificate: certFile, fieldErrors: parsed.error.flatten().fieldErrors };
    }
    return { data: parsed.data, certificate: certFile, fieldErrors: null };
  }

  const body = await req.json();
  const parsed = registerAngelSchema.safeParse(body);
  if (!parsed.success) {
    return { data: null, certificate: null, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  return { data: parsed.data, certificate: null, fieldErrors: null };
}

async function storeAngelCertificate(userId: string, file: File): Promise<void> {
  if (!(LICENSE_DOC_MIME as readonly string[]).includes(file.type)) {
    throw new Error("INVALID_CERTIFICATE_TYPE");
  }
  if (file.size > MAX_LICENSE_DOC_BYTES) {
    throw new Error("CERTIFICATE_TOO_LARGE");
  }

  const folder = licenseDocsFolder(userId);
  const key = buildKey(folder, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToS3({ key, body: buffer, contentType: file.type });

  await db.providerLicenseDocument.create({
    data: {
      userId,
      label: "Certificado profissional",
      fileKey: key,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      fileSize: file.size,
    },
  });

  notifyAdminLicenseDocumentUploaded({
    userId,
    role: "ANGEL",
    fileName: file.name,
    label: "Certificado profissional",
    totalDocs: 1,
  }).catch((err) => console.error("[angel-register] cert notify failed:", err));
}

export async function POST(req: NextRequest) {
  try {
    const { data, certificate, fieldErrors } = await parseRegisterBody(req);

    if (!data) {
      return NextResponse.json({ error: fieldErrors }, { status: 400 });
    }

    const {
      email,
      password,
      region,
      firstName,
      lastName,
      phone,
      profession,
      volunteerHelp,
      languages,
      motivation,
      campaignSlug,
      language,
      acceptedTerms,
      acceptedPrivacy,
      acceptedGdpr,
    } = data;

    if (requiresGdpr(region) && !acceptedGdpr) {
      return NextResponse.json(
        { error: { acceptedGdpr: ["GDPR consent required for EU users"] } },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const normalizedLanguage = language && ["pt", "en", "es"].includes(language) ? language : "pt";
    const preferredCampaignSlug = campaignSlug || VENEZUELA_CAMPAIGN_SLUG;

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: UserRole.ANGEL,
          region,
          language: normalizedLanguage,
        },
      });

      await tx.angelProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          phone: encrypt(phone),
          profession,
          volunteerHelp,
          languages,
          motivation: motivation || null,
          preferredCampaignSlug,
          approvalStatus: "PENDING",
        },
      });

      const consents: { type: ConsentType; granted: boolean; version: string }[] = [
        { type: "TERMS_OF_SERVICE", granted: acceptedTerms, version: "1.0" },
        { type: "PRIVACY_POLICY", granted: acceptedPrivacy, version: "1.0" },
      ];
      if (acceptedGdpr) {
        consents.push({ type: "GDPR_CONSENT", granted: true, version: "1.0" });
      }

      await tx.consent.createMany({
        data: consents.map((c) => ({
          userId: newUser.id,
          type: c.type,
          version: c.version,
          granted: c.granted,
          ipAddress: ip,
          userAgent,
        })),
      });

      return newUser;
    });

    if (certificate) {
      try {
        await storeAngelCertificate(user.id, certificate);
      } catch (certErr) {
        console.error("[ANGEL REGISTER CERT]", certErr);
        if (certErr instanceof Error && certErr.message === "INVALID_CERTIFICATE_TYPE") {
          return NextResponse.json(
            { error: { certificate: ["File type not allowed. Use PDF or image."] } },
            { status: 400 },
          );
        }
        if (certErr instanceof Error && certErr.message === "CERTIFICATE_TOO_LARGE") {
          return NextResponse.json(
            { error: { certificate: ["File too large. Maximum is 50 MB."] } },
            { status: 400 },
          );
        }
      }
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
    await db.verificationToken.create({
      data: { identifier: email.toLowerCase(), token, expires },
    });

    try {
      await sendEmailVerification({
        email: email.toLowerCase(),
        name: firstName,
        token,
        language: normalizedLanguage,
        from: ANGEL_LOGIN,
      });
    } catch (emailError) {
      console.error("[ANGEL REGISTER EMAIL]", emailError);
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[ANGEL REGISTER]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
