import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildDigitalSignTestPdf(opts: {
  doctorName: string;
  cpfMasked: string;
  locale?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const locale = opts.locale || "pt-BR";
  const date = new Date().toLocaleString(locale);

  const lines: { text: string; size: number; bold?: boolean; y: number }[] = [
    { text: "Doctor8 ? Teste de assinatura digital", size: 16, bold: true, y: 760 },
    { text: "Documento de verificacao ICP-Brasil (nao possui valor clinico).", size: 11, y: 730 },
    { text: `Profissional: ${opts.doctorName}`, size: 12, y: 690 },
    { text: `CPF cadastrado: ${opts.cpfMasked}`, size: 12, y: 670 },
    { text: `Gerado em: ${date}`, size: 10, y: 650 },
    { text: "Se a assinatura concluir com sucesso, sua configuracao esta correta.", size: 11, y: 610 },
  ];

  for (const line of lines) {
    page.drawText(line.text, {
      x: 50,
      y: line.y,
      size: line.size,
      font: line.bold ? bold : font,
      color: rgb(0.15, 0.2, 0.25),
      maxWidth: 495,
    });
  }

  return doc.save();
}
