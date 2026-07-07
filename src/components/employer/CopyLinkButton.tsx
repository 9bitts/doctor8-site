"use client";

export function CopyLinkButton({ path }: { path: string }) {
  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    alert("Link copiado!");
  }

  return (
    <button type="button" onClick={copy} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
      Copiar link
    </button>
  );
}
