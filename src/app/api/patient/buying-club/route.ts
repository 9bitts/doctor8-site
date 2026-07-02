import { NextRequest } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { GET as clubGet, POST as clubPost } from "@/app/api/buying-club/route";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  return clubGet(req);
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  return clubPost(req);
}
