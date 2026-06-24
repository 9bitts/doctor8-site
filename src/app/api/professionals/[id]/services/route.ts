import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProviderServices } from "@/lib/practice";
import type { ProviderType } from "@/lib/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerType = (req.nextUrl.searchParams.get("providerType") || "health") as ProviderType;
  const services = await getProviderServices(params.id, providerType, true);

  return NextResponse.json({ services });
}
