// Client-only PDF generator for ALTUM property brochures.
import { jsPDF } from "jspdf";
import type { Property } from "@/lib/properties";
import { buildMortgageMatrix, fmtGTQ, TERMS_YEARS } from "@/lib/mortgage";

const NAVY = [28, 33, 53] as const;        // #1C2135
const GOLD = [201, 169, 110] as const;      // #C9A96E
const CREAM = [248, 242, 230] as const;     // pale gold/cream
const FOOTER_NAVY = [19, 25, 41] as const;  // #131929
const WHATSAPP_CORP = "50251014866";
const SITE_URL = "https://altumgroup.com.gt";

interface PropertyExtra {
  parking?: number;
  area_terreno?: number;
  niveles?: number;
  cover_image?: string | null;
  features?: string[];
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } catch {
    return null;
  }
}

async function imgToDataUrl(img: HTMLImageElement): Promise<string | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

async function urlToDataUrl(url: string): Promise<string | null> {
  const img = await loadImage(url);
  if (!img) return null;
  return imgToDataUrl(img);
}

export async function generatePropertyPDF(
  p: Property & { images?: string[] } & PropertyExtra,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 32;

  // --- Header: navy band with gold underline
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 70, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 70, W, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ALTUM GROUP", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("Real Estate · Guatemala", M, 55);

  doc.setTextColor(...NAVY);
  let y = 95;

  // Title + zone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(p.title, W - 2 * M), M, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`${p.type} · ${p.operation === "venta" ? "Venta" : "Renta"} · ${p.zone}`, M, y);
  y += 18;

  // Main image
  const cover = (p.images && p.images[0]) || p.image || p.cover_image;
  if (cover) {
    const dataUrl = await urlToDataUrl(cover);
    if (dataUrl) {
      const imgH = 220;
      try { doc.addImage(dataUrl, "JPEG", M, y, W - 2 * M, imgH); } catch {}
      // Price overlay
      doc.setFillColor(...NAVY);
      doc.rect(M, y + imgH - 38, 220, 38, "F");
      doc.setFillColor(...GOLD);
      doc.rect(M, y + imgH - 38, 4, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const priceLabel = fmtGTQ(p.price) + (p.operation === "renta" ? "/mes" : "");
      doc.text(priceLabel, M + 14, y + imgH - 14);
      y += imgH + 14;
    }
  }

  // Secondary gallery: 4 thumbs, 130pt tall
  const extras = (p.images ?? []).slice(1, 5);
  if (extras.length) {
    const gap = 8;
    const thumbH = 130;
    const thumbW = (W - 2 * M - gap * (extras.length - 1)) / extras.length;
    for (let i = 0; i < extras.length; i++) {
      const d = await urlToDataUrl(extras[i]);
      if (d) {
        try { doc.addImage(d, "JPEG", M + i * (thumbW + gap), y, thumbW, thumbH); } catch {}
      }
    }
    y += thumbH + 16;
  }

  // Specs bar
  const specs = [
    { l: "Habs", v: p.beds },
    { l: "Baños", v: p.baths },
    { l: "Parqueos", v: p.parking ?? "—" },
    { l: "m² const.", v: p.area },
    { l: "m² terreno", v: p.area_terreno ?? "—" },
    { l: "Niveles", v: p.niveles ?? "—" },
  ];
  doc.setFillColor(...CREAM);
  doc.rect(M, y, W - 2 * M, 46, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  doc.line(M, y + 46, W - M, y + 46);
  const cw = (W - 2 * M) / specs.length;
  specs.forEach((s, i) => {
    const cx = M + i * cw + cw / 2;
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(s.v ?? "—"), cx, y + 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(s.l, cx, y + 36, { align: "center" });
  });
  y += 60;

  // Description
  if (p.description) {
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Descripción", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(p.description, W - 2 * M);
    if (y + lines.length * 12 > H - 80) { doc.addPage(); y = M; }
    doc.text(lines, M, y);
    y += lines.length * 12 + 12;
  }

  // Features grid
  const feats = p.amenities ?? p.features ?? [];
  if (feats.length) {
    if (y + 80 > H - 80) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Características", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const cols = 3;
    const colW = (W - 2 * M) / cols;
    feats.forEach((f, i) => {
      const cx = M + (i % cols) * colW;
      const cy = y + Math.floor(i / cols) * 16;
      doc.setTextColor(...GOLD);
      doc.text("✓", cx, cy);
      doc.setTextColor(60, 60, 60);
      doc.text(String(f), cx + 12, cy);
    });
    y += Math.ceil(feats.length / cols) * 16 + 12;
  }

  // Cotizacion section
  if (y + 160 > H - 80) { doc.addPage(); y = M; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Cotización referencial (8% anual)", M, y);
  y += 14;
  const matrix = buildMortgageMatrix(p.price, 0.08);
  // Header row
  const headers = ["Enganche", "Monto", "A financiar", ...TERMS_YEARS.map((t) => `${t} años`)];
  const colCount = headers.length;
  const tableW = W - 2 * M;
  const colWp = tableW / colCount;
  doc.setFillColor(...NAVY);
  doc.rect(M, y, tableW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, M + i * colWp + colWp / 2, y + 14, { align: "center" }));
  y += 22;
  doc.setFillColor(...CREAM);
  doc.rect(M, y, tableW, matrix.length * 22, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "normal");
  matrix.forEach((row, ri) => {
    const ry = y + ri * 22 + 14;
    const cells = [
      `${(row.downPct * 100).toFixed(0)}%`,
      fmtGTQ(row.down),
      fmtGTQ(row.financed),
      ...row.terms.map((t) => fmtGTQ(t.monthly) + "/m"),
    ];
    cells.forEach((c, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.text(c, M + i * colWp + colWp / 2, ry, { align: "center" });
    });
  });
  y += matrix.length * 22 + 14;

  // Map (static)
  if (p.lat && p.lng) {
    if (y + 140 > H - 80) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Ubicación", M, y);
    y += 12;
    // Use OSM static map alternative — staticmap.openstreetmap.de
    const staticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${p.lat},${p.lng}&zoom=15&size=800x300&markers=${p.lat},${p.lng},red-pushpin`;
    const md = await urlToDataUrl(staticUrl);
    if (md) {
      try { doc.addImage(md, "JPEG", M, y, W - 2 * M, 140); } catch {}
      y += 150;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Lat ${p.lat}, Lng ${p.lng}`, M, y + 10);
      y += 20;
    }
  }

  // CTA block
  if (y + 80 > H - 80) { doc.addPage(); y = M; }
  doc.setFillColor(...CREAM);
  doc.rect(M, y, W - 2 * M, 70, "F");
  doc.setDrawColor(...GOLD);
  doc.rect(M, y, W - 2 * M, 70);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("¿Te interesa esta propiedad?", M + 16, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Contacta a un asesor ALTUM Group — atención corporativa.", M + 16, y + 40);
  // WhatsApp button
  doc.setFillColor(37, 211, 102);
  doc.rect(W - M - 170, y + 18, 154, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.textWithLink("WhatsApp Asesor", W - M - 90, y + 38, {
    url: `https://wa.me/${WHATSAPP_CORP}`,
    align: "center",
  });
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.textWithLink(SITE_URL, M + 16, y + 60, { url: SITE_URL });
  y += 86;

  // Footer
  doc.setFillColor(...FOOTER_NAVY);
  doc.rect(0, H - 60, W, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ALTUM GROUP", M, H - 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("Real Estate Premium · Guatemala", M, H - 26);
  doc.setTextColor(220, 220, 220);
  doc.text(`WhatsApp +${WHATSAPP_CORP}  ·  info@altumgroup.com.gt  ·  ${SITE_URL}`, M, H - 14);

  const safeName = (p.title || "propiedad").replace(/[^\w-]+/g, "_").slice(0, 60);
  doc.save(`ALTUM-${safeName}.pdf`);
}
