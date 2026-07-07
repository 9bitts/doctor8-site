"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as dicomParser from "dicom-parser";

function renderPixelData(
  dataSet: dicomParser.DataSet,
  canvas: HTMLCanvasElement,
): void {
  const rows = dataSet.uint16("x00280010") ?? 0;
  const cols = dataSet.uint16("x00280011") ?? 0;
  const bitsAllocated = dataSet.uint16("x00280100") ?? 8;
  const pixelElement = dataSet.elements.x7fe00010;
  if (!pixelElement || !rows || !cols) {
    throw new Error("Missing pixel data");
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  canvas.width = cols;
  canvas.height = rows;
  const imgData = ctx.createImageData(cols, rows);
  const byteArray = dataSet.byteArray;
  const offset = pixelElement.dataOffset;
  const length = pixelElement.length;

  let min = Infinity;
  let max = -Infinity;
  const samples: number[] = [];

  if (bitsAllocated === 16) {
    const pixels = new Uint16Array(byteArray.buffer, byteArray.byteOffset + offset, length / 2);
    for (let i = 0; i < pixels.length; i++) {
      samples.push(pixels[i]);
      if (pixels[i] < min) min = pixels[i];
      if (pixels[i] > max) max = pixels[i];
    }
  } else {
    const pixels = byteArray.subarray(offset, offset + length);
    for (let i = 0; i < pixels.length; i++) {
      samples.push(pixels[i]);
      if (pixels[i] < min) min = pixels[i];
      if (pixels[i] > max) max = pixels[i];
    }
  }

  const range = max - min || 1;
  for (let i = 0; i < samples.length && i < cols * rows; i++) {
    const v = Math.round(((samples[i] - min) / range) * 255);
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

export default function DicomViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Fetch failed");
        const buf = await res.arrayBuffer();
        const byteArray = new Uint8Array(buf);
        const dataSet = dicomParser.parseDicom(byteArray);
        if (cancelled || !canvasRef.current) return;
        renderPixelData(dataSet, canvasRef.current);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "DICOM error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="rounded-lg bg-slate-100 p-4 text-xs text-rose-600">
        {error}
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="animate-spin text-white" size={24} />
        </div>
      )}
      <canvas ref={canvasRef} className="w-full max-h-96 object-contain" />
    </div>
  );
}
