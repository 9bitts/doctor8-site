import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { drawBrandLogoCentered } from "@/lib/pdf-brand-logo";

export async function buildAngelVolunteerCertificatePdf(opts: {
  volunteerName: string;
  campaignName: string;
  tracks: string[];
  totalMinutes: number;
  verifyCode: string;
  issuedAt: Date;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  await drawBrandLogoCentered(pdf, page, { topY: height - 48, maxWidth: 160 });

  const hours = (opts.totalMinutes / 60).toFixed(1);
  const tracks = opts.tracks.join(", ") || "Escuta";
  const dateStr = opts.issuedAt.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: { text: string; size: number; bold?: boolean; color?: ReturnType<typeof rgb> }[] = [
    { text: "Certificado de Voluntariado", size: 22, bold: true, color: rgb(0.13, 0.15, 0.2) },
    { text: opts.campaignName, size: 12, color: rgb(0.45, 0.5, 0.55) },
    { text: "", size: 8 },
    { text: "Certificamos que", size: 11, color: rgb(0.35, 0.4, 0.45) },
    { text: opts.volunteerName, size: 18, bold: true, color: rgb(0.75, 0.1, 0.25) },
    { text: "", size: 8 },
    {
      text: `prestou serviço voluntário humanitário na Doctor8, com ${hours} horas registradas nas trilhas: ${tracks}.`,
      size: 11,
    },
    { text: "", size: 8 },
    { text: `Emitido em ${dateStr}.`, size: 10, color: rgb(0.45, 0.5, 0.55) },
    { text: `Código de verificação: ${opts.verifyCode}`, size: 9, color: rgb(0.5, 0.55, 0.6) },
  ];

  let y = height - 120;
  for (const line of lines) {
    if (!line.text) {
      y -= line.size;
      continue;
    }
    const f = line.bold ? fontBold : font;
    const maxWidth = width - 80;
    const words = line.text.split(" ");
    let chunk = "";
    for (const word of words) {
      const test = chunk ? `${chunk} ${word}` : word;
      if (f.widthOfTextAtSize(test, line.size) > maxWidth) {
        page.drawText(chunk, {
          x: 40,
          y,
          size: line.size,
          font: f,
          color: line.color ?? rgb(0.2, 0.25, 0.3),
        });
        y -= line.size + 6;
        chunk = word;
      } else {
        chunk = test;
      }
    }
    if (chunk) {
      page.drawText(chunk, {
        x: 40,
        y,
        size: line.size,
        font: f,
        color: line.color ?? rgb(0.2, 0.25, 0.3),
      });
      y -= line.size + 10;
    }
  }

  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 80,
    borderColor: rgb(0.9, 0.4, 0.5),
    borderWidth: 2,
  });

  return pdf.save();
}
