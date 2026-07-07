import { NextResponse } from "next/server";
import { DENTAL_PROCEDURES } from "@/lib/dentistry/procedures";

export async function GET() {
  return NextResponse.json({ procedures: DENTAL_PROCEDURES });
}
