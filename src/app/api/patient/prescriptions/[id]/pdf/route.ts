import { NextRequest, NextResponse } from "next/server";

/** Patient-facing alias for prescription PDF download. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const target = new URL(`/api/professional/prescriptions/${params.id}/pdf`, req.url);
  return NextResponse.redirect(target);
}
