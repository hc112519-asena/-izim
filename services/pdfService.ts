import { jsPDF } from "jspdf";
import { InscriptionAnalysis } from "./geminiService";

interface SavedInscription {
  id: string;
  timestamp: string;
  analysis: InscriptionAnalysis;
  image?: string;
  typedText?: string;
}

/**
 * Generates a highly stylized, professional PDF report for an epigraphic finding.
 * Styled with traditional design elements (borders, headers, and structured tables).
 */
export const generatePdfReport = async (item: SavedInscription) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { analysis } = item;
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // Palettes (Clay, Dark Charcoal, Warm Cream, Pale Brass)
  const CLAY_COLOR = [140, 45, 25]; // #8c2d19
  const CHARCOAL = [34, 34, 34]; // #222222
  const STONE_BG = [252, 248, 242]; // Warm background tint for code blocks
  const BRASS_DARK = [138, 106, 42]; // Antique gold details

  // HELPER Functions
  const drawDoubleBorder = () => {
    doc.setDrawColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16); // Outer border
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19); // Inner borderLine
  };

  const drawHeader = () => {
    // Top Branded Strip
    doc.setFillColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.rect(12, 12, pageWidth - 24, 7, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(
      "HATICE CEYLAN KAZI VE CIZIM ATOLYESI  *  EPIGRAFI DEPARTMANI",
      pageWidth / 2,
      17,
      { align: "center" }
    );

    // Document Title
    doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
    doc.setFont("Times", "bold");
    doc.setFontSize(18);
    doc.text("EPIGRAFIK BULUNTU BELGELEME KARNESI", pageWidth / 2, 28, {
      align: "center",
    });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(
      "ARCHAEOLOGICAL FIELD REGISTRATION SHEET & EPIGRAPHICAL DOSSIER",
      pageWidth / 2,
      32,
      { align: "center" }
    );

    // Decorative Flourish Line
    doc.setDrawColor(BRASS_DARK[0], BRASS_DARK[1], BRASS_DARK[2]);
    doc.setLineWidth(0.4);
    doc.line(40, 35, pageWidth - 40, 35);
  };

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.setLineWidth(0.4);
    doc.line(12, pageHeight - 15, pageWidth - 24, pageHeight - 15);

    doc.setTextColor(120, 120, 120);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Hatice Ceylan Dijital Kazi Atolyesi - Arkeoloji Bilgi Sistemi | Belge Kod: " +
        item.id,
      12,
      pageHeight - 11
    );
    doc.text("Sayfa " + pageNum, pageWidth - 24, pageHeight - 11, {
      align: "right",
    });
  };

  // Convert Turkish Special Characters Safely to ensure clean PDF rendering without fallback symbols
  const safeText = (txt: string | undefined): string => {
    if (!txt) return "";
    return txt
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/İ/g, "I")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ş/g, "S")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C");
  };

  // PAGE 1 SETUP
  drawDoubleBorder();
  drawHeader();

  let y = 41;

  // Metadata Card Block (Table Layout)
  doc.setFillColor(STONE_BG[0], STONE_BG[1], STONE_BG[2]);
  doc.rect(12, y, pageWidth - 24, 25, "F");
  doc.setDrawColor(210, 200, 185);
  doc.setLineWidth(0.3);
  doc.rect(12, y, pageWidth - 24, 25);

  // Divider lines inside Metadata box
  doc.line(pageWidth / 2, y, pageWidth / 2, y + 25);
  doc.line(12, y + 12.5, pageWidth - 12, y + 12.5);

  // Fill Grid Metadata
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);

  // Top-Left: Dil
  doc.text("KAYITLI DIL / LANGUAGE:", 15, y + 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(safeText(analysis.language), 15, y + 9);

  // Top-Right: Donem
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("TAHMINI DONEM / PERIOD:", pageWidth / 2 + 5, y + 5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(safeText(analysis.period), pageWidth / 2 + 5, y + 9);

  // Bottom-Left: Yazit Sistemi
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("YAZI SISTEMI / SCRIPT:", 15, y + 17.5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(safeText(analysis.script), 15, y + 21.5);

  // Bottom-Right: Kondisyon
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("FISIKSEL DURUM / PRESERVATION:", pageWidth / 2 + 5, y + 17.5);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(safeText(analysis.preservationState), pageWidth / 2 + 5, y + 21.5);

  y += 31;

  // Let's print out the Registration Metadata
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text("RAPOR REFERANS NO: " + item.id, 12, y);
  doc.text("KAYIT TARIHI: " + safeText(item.timestamp), pageWidth - 12, y, {
    align: "right",
  });

  y += 5;

  // Let's add the Inscription Image if it exists
  if (item.image) {
    try {
      // Determine height depending on image proportions
      const imageWidth = 55;
      const imageHeight = 40;
      doc.setFillColor(248, 244, 236);
      doc.rect(12, y, imageWidth, imageHeight, "F");
      doc.rect(12, y, imageWidth, imageHeight, "S");
      doc.addImage(item.image, "JPEG", 13, y + 1, imageWidth - 2, imageHeight - 2);

      // Section 1: Transkripsiyon placed right of image
      const textX = 72;
      const textWidth = pageWidth - 12 - textX;

      doc.setFillColor(STONE_BG[0], STONE_BG[1], STONE_BG[2]);
      doc.rect(textX, y, textWidth, imageHeight, "F");
      doc.setDrawColor(BRASS_DARK[0], BRASS_DARK[1], BRASS_DARK[2]);
      doc.line(textX, y, textX, y + imageHeight); // highlighted left line

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
      doc.text("ORIGINAL TRANSCRIPTION / EPIGRAPHIC TEXT:", textX + 3, y + 5);

      doc.setFont("Times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);

      // Split original transcription characters to fit box (No safeText translation here for original non-Turkish representations like Greek or Arabic)
      const lines = doc.splitTextToSize(analysis.transcription, textWidth - 6);
      doc.text(lines.slice(0, 6), textX + 3, y + 11);

      y += imageHeight + 8;
    } catch (e) {
      console.error("Could not render image inside PDF:", e);
      // Fallback in case of base64 load failure (e.g. invalid type) -> treat normally
      item.image = undefined;
    }
  }

  // If there wasn't an image or image failed, draw original transcription full-width
  if (!item.image) {
    const textWidth = pageWidth - 24;
    doc.setFillColor(STONE_BG[0], STONE_BG[1], STONE_BG[2]);
    doc.rect(12, y, textWidth, 30, "F");
    doc.setDrawColor(BRASS_DARK[0], BRASS_DARK[1], BRASS_DARK[2]);
    doc.line(12, y, 12, y + 30); // left highlight
    doc.rect(12, y, textWidth, 30, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.text("ORIGINAL TRANSCRIPTION / EPIGRAPHIC TEXT:", 15, y + 6);

    doc.setFont("Times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);

    const lines = doc.splitTextToSize(analysis.transcription, textWidth - 8);
    doc.text(lines.slice(0, 4), 15, y + 13);

    y += 38;
  }

  // Phonetic Translitaration Box (if present)
  if (analysis.transliteration) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.text("PHONETIC TRANSLITERATION (OKUNUS):", 12, y);
    y += 3;
    doc.setFont("Courier", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const transLines = doc.splitTextToSize(
      safeText(analysis.transliteration),
      pageWidth - 24
    );
    doc.text(transLines, 12, y);
    y += transLines.length * 4.5 + 4;
  }

  // Segment 2: Translations Side-by-Side
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("TERCUMELER / TRANSLATIONS", 12, y);
  
  doc.setLineWidth(0.35);
  doc.setDrawColor(BRASS_DARK[0], BRASS_DARK[1], BRASS_DARK[2]);
  doc.line(12, y + 1.5, pageWidth - 12, y + 1.5);
  y += 6;

  const colWidth = (pageWidth - 28) / 2;
  const colHeight = 35;

  // Let's calculate lines first to see if they fit
  doc.setFont("Times", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  const trLines = doc.splitTextToSize(safeText(analysis.translationTr), colWidth - 4);
  const enLines = doc.splitTextToSize(safeText(analysis.translationEn), colWidth - 4);

  // Left column (Turkish)
  doc.setFillColor(254, 253, 250);
  doc.rect(12, y, colWidth, colHeight, "F");
  doc.rect(12, y, colWidth, colHeight, "S");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("TURKCE CEVIRI", 14, y + 4.5);

  doc.setFont("Times", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(trLines.slice(0, 6), 14, y + 10);

  // Right column (English)
  doc.setFillColor(254, 253, 250);
  doc.rect(12 + colWidth + 4, y, colWidth, colHeight, "F");
  doc.rect(12 + colWidth + 4, y, colWidth, colHeight, "S");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("ENGLISH TRANSLATION", 12 + colWidth + 6, y + 4.5);

  doc.setFont("Times", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.text(enLines.slice(0, 6), 12 + colWidth + 6, y + 10);

  y += colHeight + 8;

  // Segment 3: Historical and Archaeological Analysis
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
  doc.text("TARIHSEL VE ARKEOLOJIK DEGERLENDIRME", 12, y);
  
  doc.line(12, y + 1.5, pageWidth - 12, y + 1.5);
  y += 6;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  const histLines = doc.splitTextToSize(safeText(analysis.historicalContext), pageWidth - 24);
  
  // Decide if historic context fits on page 1, if not overflow to Page 2
  const linesLeft = Math.floor((pageHeight - 20 - y) / 4);
  
  if (linesLeft >= histLines.length) {
    // Fits perfectly
    doc.text(histLines, 12, y, { maxWidth: pageWidth - 24, align: "justify" });
    y += histLines.length * 4.2 + 8;

    // Segment 4: Drafts guidelines (Drawing suggestions)
    if (analysis.drawingTips) {
      if (pageHeight - y < 35) {
        // Create Page 2 for Drawing Guidelines
        drawFooter(1);
        doc.addPage();
        drawDoubleBorder();
        drawHeader();
        y = 45;
        drawFooter(2);
      }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
      doc.text("CIZIM VE TEKNIK ILUSTRASYON ONERILERI", 12, y);
      doc.line(12, y + 1.5, pageWidth - 12, y + 1.5);
      y += 6;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const drawLines = doc.splitTextToSize(safeText(analysis.drawingTips), pageWidth - 24);
      doc.text(drawLines, 12, y, { maxWidth: pageWidth - 24, align: "justify" });
    }

    drawFooter(doc.internal.pages.length - 1);
  } else {
    // Draw what fits, then overflow the rest onto Page 2
    const part1 = histLines.slice(0, linesLeft);
    doc.text(part1, 12, y, { maxWidth: pageWidth - 24, align: "justify" });
    drawFooter(1);

    // Page 2
    doc.addPage();
    drawDoubleBorder();
    drawHeader();
    y = 45;
    drawFooter(2);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
    doc.text("TARIHSEL VE ARKEOLOJIK DEGERLENDIRME (DEVAMI)", 12, y);
    doc.line(12, y + 1.5, pageWidth - 12, y + 1.5);
    y += 6;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
    const part2 = histLines.slice(linesLeft);
    doc.text(part2, 12, y, { maxWidth: pageWidth - 24, align: "justify" });
    y += part2.length * 4.2 + 8;

    if (analysis.drawingTips) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(CLAY_COLOR[0], CLAY_COLOR[1], CLAY_COLOR[2]);
      doc.text("CIZIM VE TEKNIK ILUSTRASYON ONERILERI", 12, y);
      doc.line(12, y + 1.5, pageWidth - 12, y + 1.5);
      y += 6;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const drawLines = doc.splitTextToSize(safeText(analysis.drawingTips), pageWidth - 24);
      doc.text(drawLines, 12, y, { maxWidth: pageWidth - 24, align: "justify" });
    }
  }

  // Save/Download the file
  doc.save(`kitabe_raporu_${item.id}.pdf`);
};
