// Organization (CNPJ) registration ? creates User + Organization + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, UserRegion, ConsentType } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { isValidCnpj, stripCnpj, slugifyOrganizationName } from "@/lib/cnpj";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const registerOrgSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().min(2).max(120),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  contactPhone: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.organization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerOrgSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;
    const cnpjDigits = stripCnpj(parsed.cnpj);
    if (!isValidCnpj(cnpjDigits)) {
      return NextResponse.json(
        { error: { cnpj: ["CNPJ inválido"] } },
        { status: 400 },
      );
    }

    const email = parsed.email.toLowerCase();

    const [existingEmail, existingCnpj] = await Promise.all([
      db.user.findUnique({ where: { email } }),
      db.organization.findUnique({ where: { cnpj: cnpjDigits } }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 },
      );
    }
    if (existingCnpj) {
      return NextResponse.json(
        { error: { cnpj: ["CNPJ já cadastrado"] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const normalizedLanguage =
      parsed.language === "pt" || parsed.language === "es" || parsed.language === "en"
        ? parsed.language
        : "pt";

    const slug = await uniqueSlug(parsed.nomeFantasia);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ORGANIZATION,
          region: UserRegion.BR,
          language: normalizedLanguage,
        },
      });

      const org = await tx.organization.create({
        data: {
          cnpj: cnpjDigits,
          razaoSocial: parsed.razaoSocial,
          nomeFantasia: parsed.nomeFantasia,
          slug,
          contactEmail: email,
          contactPhone: parsed.contactPhone,
          responsibleFirstName: parsed.responsibleFirstName,
          responsibleLastName: parsed.responsibleLastName,
          addressStreet: parsed.addressStreet,
          addressNumber: parsed.addressNumber,
          addressComplement: parsed.addressComplement,
          addressNeighborhood: parsed.addressNeighborhood,
          addressCity: parsed.addressCity,
          addressState: parsed.addressState,
          addressZip: parsed.addressZip?.replace(/\D/g, ""),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await tx.consent.createMany({
        data: [
          { userId: newUser.id, type: ConsentType.TERMS_OF_SERVICE, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.PRIVACY_POLICY, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.GDPR_CONSENT, version: "1.0", granted: true, ipAddress: ip, userAgent },
        ],
      });

      return newUser;
    });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    try {
      await sendEmailVerification({
        email,
        name: parsed.responsibleFirstName,
        token,
        language: normalizedLanguage,
      });
    } catch (emailError) {
      console.error("[ORG REGISTER EMAIL ERROR]", emailError);
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[ORG REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
