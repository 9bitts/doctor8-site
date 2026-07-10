"use client";

import Link from "next/link";
import { splitMessageLinks, hrefForMessageLink } from "@/lib/message-links";

export function MessageBody({
  content,
  isMine,
}: {
  content: string;
  isMine: boolean;
}) {
  const linkClass = isMine
    ? "underline text-white/95 break-all hover:text-white"
    : "underline text-brand-600 break-all hover:text-brand-700";

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {splitMessageLinks(content).map((part, i) => {
        if (part.type === "link") {
          const href = hrefForMessageLink(part.value);
          if (href.startsWith("/")) {
            return (
              <Link key={i} href={href} className={linkClass}>
                {part.value}
              </Link>
            );
          }
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {part.value}
            </a>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </p>
  );
}
