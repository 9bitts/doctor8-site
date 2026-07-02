import { NextRequest } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { GET as searchGet } from "@/app/api/buying-club/drugs/search/route";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  return searchGet(req);
}
