// Client-only PDF generator for ALTUM property brochures.
import { jsPDF } from "jspdf";
import type { Property } from "@/lib/properties";
import { formatMoney } from "@/lib/properties";
import { buildMortgageMatrix, TERMS_YEARS } from "@/lib/mortgage";

const NAVY = [28, 33, 53] as const;        // #1C2135
const GOLD = [201, 169, 110] as const;      // #C9A96E
const CREAM = [248, 242, 230] as const;     // pale gold/cream
const FOOTER_NAVY = [19, 25, 41] as const;  // #131929
const WHATSAPP_CORP = "50251014866";
const SITE_URL = "https://altumgroup.com.gt";

interface PropertyExtra {
  parking?: number;
  cover_image?: string | null;
  features?: string[];
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Recorta la imagen para llenar el marco (estilo object-fit cover),
// centrada y sin deformar. Devuelve un JPEG en dataURL.
function coverCrop(img: HTMLImageElement, boxW: number, boxH: number): string | null {
  try {
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(boxW * scale);
    canvas.height = Math.round(boxH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return null;

    const boxRatio = canvas.width / canvas.height;
    const imgRatio = iw / ih;

    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;

    if (imgRatio > boxRatio) {
      sh = ih;
      sw = ih * boxRatio;
      sx = (iw - sw) / 2;
    } else {
      sw = iw;
      sh = iw / boxRatio;
      sy = (ih - sh) / 2;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}

async function urlToCover(url: string, boxW: number, boxH: number): Promise<string | null> {
  const img = await loadImage(url);
  if (!img) return null;
  return coverCrop(img, boxW, boxH);
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
  const curr = (p.currency === "USD" ? "USD" : "GTQ") as "GTQ" | "USD";

  // Title + zone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(p.title, W - 2 * M), M, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const opLabel = p.operation === "venta" ? "Venta" : "Renta";
  doc.text(p.type + "  ·  " + opLabel + "  ·  " + p.zone, M, y);
  y += 18;

  // Main image (cover-crop, sin deformar)
  const cover = (p.images && p.images[0]) || p.image || p.cover_image;
  if (cover) {
    const imgH = 252;
    const imgW = W - 2 * M;
    const dataUrl = await urlToCover(cover, imgW, imgH);
    if (dataUrl) {
      try { doc.addImage(dataUrl, "JPEG", M, y, imgW, imgH); } catch {}
      // Hairline dorada bajo la foto
      doc.setFillColor(...GOLD);
      doc.rect(M, y + imgH, imgW, 2, "F");
      // Etiqueta de precio
      const tagW = 188;
      const tagH = 40;
      doc.setFillColor(...NAVY);
      doc.rect(M + 16, y + imgH - tagH - 16, tagW, tagH, "F");
      doc.setFillColor(...GOLD);
      doc.rect(M + 16, y + imgH - tagH - 16, 4, tagH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      const priceLabel = formatMoney(p.price, curr) + (p.operation === "renta" ? "/mes" : "");
      doc.text(priceLabel, M + 30, y + imgH - 16 - 14);
      y += imgH + 18;
    }
  }

  // Secondary gallery: 4 thumbs (cover-crop, sin deformar)
  const extras = (p.images ?? []).slice(1, 5);
  if (extras.length) {
    const gap = 8;
    const thumbH = 116;
    const thumbW = (W - 2 * M - gap * (extras.length - 1)) / extras.length;
    for (let i = 0; i < extras.length; i++) {
      const d = await urlToCover(extras[i], thumbW, thumbH);
      const tx = M + i * (thumbW + gap);
      if (d) {
        try { doc.addImage(d, "JPEG", tx, y, thumbW, thumbH); } catch {}
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.4);
        doc.rect(tx, y, thumbW, thumbH);
      }
    }
    y += thumbH + 18;
  }

  // Specs bar — solo campos que el vendedor llena al publicar
  const specs = [
    { l: "Habitaciones", v: p.beds || "—" },
    { l: "Baños", v: p.baths || "—" },
    { l: "Parqueos", v: p.parking ?? "—" },
    { l: "m² construcción", v: p.area || "—" },
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
      doc.text("•", cx, cy);
      doc.setTextColor(60, 60, 60);
      doc.text(String(f), cx + 12, cy);
    });
    y += Math.ceil(feats.length / cols) * 16 + 12;
  }

  // Cotizacion section — solo para VENTA (no aplica a rentas)
  if (p.operation === "venta") {
    if (y + 160 > H - 80) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Cotización referencial (8% anual)", M, y);
    y += 14;
    const matrix = buildMortgageMatrix(p.price, 0.08);
    const termHeaders = TERMS_YEARS.map((t) => t + " años");
    const headers = ["Enganche", "Monto", "A financiar"].concat(termHeaders);
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
      const pct = (row.downPct * 100).toFixed(0) + "%";
      const monthly = row.terms.map((t) => formatMoney(t.monthly, curr) + "/m");
      const cells = [pct, formatMoney(row.down, curr), formatMoney(row.financed, curr)].concat(monthly);
      cells.forEach((c, i) => {
        doc.setFont("helvetica", i === 0 ? "bold" : "normal");
        doc.text(c, M + i * colWp + colWp / 2, ry, { align: "center" });
      });
    });
    y += matrix.length * 22 + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text("Cálculo referencial. Sujeto a aprobación bancaria. No constituye oferta de crédito.", M, y);
    y += 14;
  }

  // Ubicación — bloque elegante con enlace a Google Maps
  // (el servicio de mapas estáticos gratuito dejó de funcionar; un botón
  //  enlazado es más confiable y igual de útil para el cliente)
  if (p.lat && p.lng) {
    if (y + 80 > H - 80) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text("Ubicación", M, y);
    y += 10;
    const boxH = 54;
    doc.setFillColor(...CREAM);
    doc.rect(M, y, W - 2 * M, boxH, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.rect(M, y, W - 2 * M, boxH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(p.zone + ", Ciudad de Guatemala", M + 16, y + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Ubicación exacta compartida por tu asesor al coordinar visita", M + 16, y + 38);
    // Botón "Ver en Google Maps"
    const gmaps = "https://www.google.com/maps?q=" + p.lat + "," + p.lng;
    const btnW = 150;
    const btnH = 30;
    const btnX = W - M - btnW - 12;
    const btnY = y + (boxH - btnH) / 2;
    doc.setFillColor(...NAVY);
    doc.rect(btnX, btnY, btnW, btnH, "F");
    doc.setFillColor(...GOLD);
    doc.rect(btnX, btnY, 3, btnH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.textWithLink("Ver en Google Maps", btnX + btnW / 2 + 2, btnY + 19, {
      url: gmaps,
      align: "center",
    });
    y += boxH + 16;
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
    url: "https://wa.me/" + WHATSAPP_CORP,
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
  const footLine = "WhatsApp +" + WHATSAPP_CORP + "  ·  info@altumgroup.com.gt  ·  " + SITE_URL;
  doc.text(footLine, M, H - 14);

  const safeName = (p.title || "propiedad").replace(/[^\w-]+/g, "_").slice(0, 60);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save("ALTUM-" + safeName + "-" + stamp + ".pdf");
}
