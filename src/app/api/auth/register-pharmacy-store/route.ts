// Pharmacy store (B2B drogaria) registration — User + PharmacyStore + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { PHARMACY_STORE_LOGIN } from "@/lib/pharmacy-store-portal";
import { geocodeAddress } from "@/lib/pharmacy-network/geocode";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { isValidCnpj, stripCnpj, slugifyOrganizationName } from "@/lib/cnpj";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
import { handleExistingB2BRegistration } from "@/lib/b2b-admin";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const registerPharmacyStoreSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().min(2).max(120),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  addressZip: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedLgpd: z.literal(true),
});

async function uniquePharmacyStoreSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.pharmacyStore.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerPharmacyStoreSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-pharmacy-store:email", key: parsed.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register-pharmacy-store:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const cnpjDigits = stripCnpj(parsed.cnpj);
    if (!isValidCnpj(cnpjDigits)) {
      return NextResponse.json({ error: { cnpj: ["CNPJ inválido"] } }, { status: 400 });
    }

    const phoneParsed = parseRegistrationPhone({
      phoneDdi: parsed.phoneDdi,
      phoneNational: parsed.phoneNational,
    });
    if ("error" in phoneParsed) {
      return NextResponse.json(
        { error: { phoneNational: [registrationPhoneErrorMessage(parsed.language, phoneParsed.error)] } },
        { status: 400 },
      );
    }
    const contactPhone = `+${phoneParsed.e164}`;
    const email = parsed.email.toLowerCase();
    const normalizedLanguage =
      parsed.language === "pt" || parsed.language === "es" || parsed.language === "en"
        ? parsed.language
        : "pt";

    const [existingEmail, existingCnpj] = await Promise.all([
      db.user.findUnique({
        where: { email },
        select: {
          id: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          language: true,
        },
      }),
      db.pharmacyStore.findUnique({ where: { cnpj: cnpjDigits } }),
    ]);

    const existingResult = await handleExistingB2BRegistration({
      existingUser: existingEmail,
      expectedRole: UserRole.PHARMACY_STORE,
      email,
      name: parsed.responsibleFirstName,
      language: normalizedLanguage,
      from: PHARMACY_STORE_LOGIN,
      callbackUrl: "/farmacias/painel",
    });
    if (existingResult) {
      return NextResponse.json(existingResult, { status: 200 });
    }
    if (existingCnpj) {
      // CNPJ is public data — explicit 409 helps legitimate registrants (unlike e-mail anti-enumeration).
      return NextResponse.json({ error: { cnpj: ["CNPJ já cadastrado"] } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";

    const slug = await uniquePharmacyStoreSlug(parsed.nomeFantasia);
    const addressZip = parsed.addressZip?.replace(/\D/g, "") || undefined;

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.PHARMACY_STORE,
          region: "BR",
          language: normalizedLanguage,
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      const store = await tx.pharmacyStore.create({
        data: {
          cnpj: cnpjDigits,
          razaoSocial: parsed.razaoSocial,
          nomeFantasia: parsed.nomeFantasia,
          slug,
          contactEmail: email,
          contactPhone,
          responsibleFirstName: parsed.responsibleFirstName,
          responsibleLastName: parsed.responsibleLastName,
          addressZip,
          addressStreet: parsed.addressStreet,
          addressNumber: parsed.addressNumber,
          addressComplement: parsed.addressComplement,
          addressNeighborhood: parsed.addressNeighborhood,
          addressCity: parsed.addressCity,
          addressState: parsed.addressState,
          status: "PENDING_REVIEW",
        },
      });

      await tx.pharmacyStoreMember.create({
        data: {
          pharmacyStoreId: store.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms: parsed.acceptedTerms,
        acceptedPrivacy: parsed.acceptedPrivacy,
        acceptedLgpd: parsed.acceptedLgpd,
      });

      return { newUser, store };
    });

    void (async () => {
      try {
        const geo = await Promise.race([
          geocodeAddress({
            street: user.store.addressStreet,
            number: user.store.addressNumber,
            neighborhood: user.store.addressNeighborhood,
            city: user.store.addressCity,
            state: user.store.addressState,
            zip: user.store.addressZip,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (geo) {
          await db.pharmacyStore.update({
            where: { id: user.store.id },
            data: { latitude: geo.latitude, longitude: geo.longitude },
          });
        }
      } catch (geoError) {
        console.error("[PHARMACY STORE GEO ERROR]", geoError);
      }
    })();

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({ data: { identifier: email, token, expires } });

    let emailSent = true;
    try {
      await sendEmailVerification({
        email,
        name: parsed.responsibleFirstName,
        token,
        language: normalizedLanguage,
        from: PHARMACY_STORE_LOGIN,
        callbackUrl: "/farmacias/painel",
      });
    } catch (emailError) {
      console.error("[PHARMACY STORE REGISTER EMAIL ERROR]", emailError);
      emailSent = false;
    }

    return NextResponse.json({ success: true, userId: user.newUser.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[PHARMACY STORE REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
