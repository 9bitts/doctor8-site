import { NextResponse } from "next/server";
import { getContentAsset } from "@/lib/employer-content-assets";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params;
  const asset = await getContentAsset(contentId);

  if (!asset) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  if (asset.audioKey) {
    const url = await getSignedReadUrl(asset.audioKey, 3600);
    return NextResponse.redirect(url);
  }

  if (asset.publicUrl) {
    return NextResponse.redirect(asset.publicUrl);
  }

  return NextResponse.json({ error: "No audio source" }, { status: 404 });
}
