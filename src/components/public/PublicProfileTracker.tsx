"use client";

import { useEffect } from "react";

export default function PublicProfileTracker({
  slug,
  source = "public_profile",
}: {
  slug: string;
  source?: "public_profile" | "public_search" | "public_embed";
}) {
  useEffect(() => {
    const key = `d8_view_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    fetch(`/api/public/professionals/${slug}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view", source }),
    }).catch(() => {});
  }, [slug, source]);

  return null;
}

export function trackPublicBookClick(
  slug: string,
  source: "public_profile" | "public_search" | "public_embed"
) {
  fetch(`/api/public/professionals/${slug}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "book_click", source }),
  }).catch(() => {});
}
