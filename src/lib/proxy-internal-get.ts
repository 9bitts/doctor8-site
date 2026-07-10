import { NextRequest, NextResponse } from "next/server";

/** Proxies a same-origin GET through the caller's session cookies (no redirect). */
export async function proxyInternalGet(
  req: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const target = new URL(pathname, req.url);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const upstream = await fetch(target, {
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
