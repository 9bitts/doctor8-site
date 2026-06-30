import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { ADMIN_PROVIDER_TABS, type AdminProviderTab } from "@/lib/admin-provider-categories";
import { listAdminProviders } from "@/lib/admin-providers-list";

const VALID_TABS = new Set<string>(ADMIN_PROVIDER_TABS.map((t) => t.id));

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tabParam = new URL(req.url).searchParams.get("tab");
  const tab: AdminProviderTab =
    tabParam && VALID_TABS.has(tabParam) ? (tabParam as AdminProviderTab) : "pendentes";

  const payload = await listAdminProviders(tab);
  return NextResponse.json(payload);
}
