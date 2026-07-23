import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProviderServices } from "@/lib/practice";
import { PROVIDER_TYPE_ENUM, toPracticeProviderType, type ProviderType } from "@/lib/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("providerType") || "health";
  if (!(PROVIDER_TYPE_ENUM as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "Invalid providerType" }, { status: 400 });
  }
  const providerType = raw as ProviderType;
  const services = await getProviderServices(params.id, toPracticeProviderType(providerType), true);

  return NextResponse.json({ services });
}
