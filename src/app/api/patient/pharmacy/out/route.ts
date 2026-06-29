import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildPartnerPurchaseUrl,
  sanitizePartnerRedirectUrl,
} from "@/lib/pharmacy-marketplace/partner-url";
import { getPharmacyIntegrationMode } from "@/lib/pharmacy-marketplace/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (getPharmacyIntegrationMode() === "disabled") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const partnerUrl = searchParams.get("partnerUrl")?.trim();

  let target: string | null = null;

  if (partnerUrl) {
    target = sanitizePartnerRedirectUrl(partnerUrl);
  } else {
    const drugCatalogId = searchParams.get("drugCatalogId")?.trim();
    const name = searchParams.get("name")?.trim();
    const cep = (searchParams.get("cep") || "").trim() || undefined;

    let drug = null;
    if (drugCatalogId) {
      drug = await db.drugCatalog.findFirst({
        where: { id: drugCatalogId, active: true, country: "BR" },
        select: {
          id: true,
          name: true,
          activeIngredient: true,
          presentation: true,
        },
      });
    }

    if (!drug && name) {
      drug = {
        id: undefined,
        name,
        activeIngredient: searchParams.get("activeIngredient")?.trim() || name,
        presentation: searchParams.get("presentation")?.trim() || "",
      };
    }

    if (!drug) {
      return new NextResponse("Bad request", { status: 400 });
    }

    target = buildPartnerPurchaseUrl(
      {
        drugCatalogId: drug.id,
        name: drug.name,
        activeIngredient: drug.activeIngredient,
        presentation: drug.presentation,
      },
      cep,
    );
  }

  if (!target) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
