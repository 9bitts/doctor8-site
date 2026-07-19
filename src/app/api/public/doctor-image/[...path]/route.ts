// Public Doctor Image media — cover/gallery intentionally public on live profiles.
// Key shape: doctor-image/<userId>/<file>

import { NextRequest, NextResponse } from "next/server";
import { downloadFromS3 } from "@/lib/s3";

const KEY_RE = /^doctor-image\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path || [];
  if (segments.length < 2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = `doctor-image/${segments.join("/")}`;
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { body, contentType } = await downloadFromS3(key);
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
