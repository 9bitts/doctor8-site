import QRCode from "qrcode";

export async function generateQrPngBuffer(text: string, size = 200): Promise<Uint8Array> {
  const buf = await QRCode.toBuffer(text, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return new Uint8Array(buf);
}
