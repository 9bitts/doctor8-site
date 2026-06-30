"use client";

import { Fragment, type ReactNode } from "react";

function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/(?<=[.!?:;])\s+(?=\d+\.\s)/g, "\n")
    .replace(/(?<=\S)\s+(?=\d+\.\s+(?:\*\*|[A-Z???????]))/g, "\n");
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${partIndex++}`;

    if (match[2] !== undefined) {
      parts.push(
        <strong key={key} className="font-semibold text-slate-900">
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      parts.push(
        <a
          key={key}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          {match[3]}
        </a>,
      );
    } else if (match[5] !== undefined) {
      parts.push(
        <a
          key={key}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800 break-all"
        >
          {match[5]}
        </a>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default function SupportMessageContent({ content }: { content: string }) {
  const lines = normalizeContent(content).split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockIndex = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        if (!itemMatch) break;
        items.push(
          <li key={i} className="pl-0.5">
            {parseInline(itemMatch[1], `ol-${i}`)}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ol
          key={`block-${blockIndex++}`}
          className="list-decimal pl-4 space-y-1.5 my-0.5 marker:font-semibold marker:text-emerald-700"
        >
          {items}
        </ol>,
      );
      continue;
    }

    const bulletMatch = line.match(/^[-*?]\s+(.*)$/);
    if (bulletMatch) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^[-*?]\s+(.*)$/);
        if (!itemMatch) break;
        items.push(
          <li key={i} className="pl-0.5">
            {parseInline(itemMatch[1], `ul-${i}`)}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul
          key={`block-${blockIndex++}`}
          className="list-disc pl-4 space-y-1.5 my-0.5 marker:text-emerald-600"
        >
          {items}
        </ul>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current) break;
      if (/^\d+\.\s+/.test(current) || /^[-*?]\s+/.test(current)) break;
      paragraphLines.push(current);
      i++;
    }

    blocks.push(
      <p key={`block-${blockIndex++}`} className="my-0.5">
        {paragraphLines.map((part, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {parseInline(part, `p-${blockIndex}-${idx}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  if (blocks.length === 0) {
    return <span>{parseInline(content, "plain")}</span>;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}
