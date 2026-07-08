import { NextResponse } from "next/server";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { buildPharmacyStoreAnalytics } from "@/lib/pharmacy-store-analytics";

export async function GET() {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const analytics = await buildPharmacyStoreAnalytics(ctx.pharmacyStoreId);
  return NextResponse.json({ analytics });
}
