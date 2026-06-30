import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { ADMIN_PROVIDER_TABS, type AdminProviderTab } from "@/lib/admin-provider-categories";
import { listAdminProviders, searchAdminProviders } from "@/lib/admin-providers-list";

const VALID_TABS = new Set<string>(ADMIN_PROVIDER_TABS.map((t) => t.id));

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    if (q) {
      const payload = await searchAdminProviders(q);
      return NextResponse.json(payload);
    }

    const tabParam = searchParams.get("tab");
    const tab: AdminProviderTab =
      tabParam && VALID_TABS.has(tabParam) ? (tabParam as AdminProviderTab) : "pendentes";

    const payload = await listAdminProviders(tab);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/admin/providers]", error);
    return NextResponse.json(
      { error: "Failed to load providers" },
      { status: 500 },
    );
  }
}
