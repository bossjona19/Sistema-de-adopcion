// Utilidad de exportación de listados (A5 · Reportes).
// CSV es nativo (0 KB). PDF (jsPDF + autotable) y Excel (SheetJS) se cargan
// de forma DIFERIDA vía CDN, solo cuando el usuario exporta.
//
// `columns`: [{ label, value: (row) => string|number }]

// ── Carga diferida de librerías ───────────────────────────────
const _loaded = {};
function loadScript(key, src) {
  if (_loaded[key]) return _loaded[key];
  _loaded[key] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
  return _loaded[key];
}

async function ensureJsPDF() {
  if (!window.jspdf) await loadScript('jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
  await loadScript('autotable', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
  return window.jspdf.jsPDF;
}
async function ensureXLSX() {
  if (!window.XLSX) await loadScript('xlsx', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  return window.XLSX;
}

function matrix(columns, rows) {
  return rows.map(r => columns.map(c => {
    const v = c.value(r);
    return v == null ? '' : v;
  }));
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── CSV (nativo) ──────────────────────────────────────────────
export function exportCSV(filename, columns, rows) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(c => esc(c.label)).join(',');
  const body = rows.map(r => columns.map(c => esc(c.value(r))).join(',')).join('\n');
  const csv  = '﻿' + head + '\n' + body; // BOM → acentos correctos en Excel
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

// ── PDF (jsPDF + autotable) ───────────────────────────────────
export async function exportPDF(title, filename, columns, rows) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF();
  doc.setFontSize(13);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString('es-ES'), 14, 22);
  doc.autoTable({
    head: [columns.map(c => c.label)],
    body: matrix(columns, rows),
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [55, 138, 221] },
  });
  doc.save(filename);
}

// ── Logo → dataURL (best-effort; si CORS lo impide, se omite) ─
function loadLogo(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch { resolve(null); } // canvas "tainted" por CORS
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Reporte institucional (cabecera ONG + secciones) ─────────
// org: { nombre, contacto, direccion, logo_url }
// bloques: [{ heading?, lines?: string[], table?: { columns:[], rows:[[]] } }]
export async function reportePDF(org, titulo, bloques, filename) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ACCENT = [55, 138, 221];
  const M = 14;                 // margen
  const LABEL_W = 46;           // ancho de la columna de etiquetas (kv)
  let y = 14;

  const ensure = (need = 8) => { if (y + need > pageH - 16) { doc.addPage(); y = 16; } };

  // ── Cabecera institucional ──
  const logo = await loadLogo(org?.logo_url);
  if (logo) {
    const h = 16, w = Math.min(40, (logo.w / logo.h) * h);
    try { doc.addImage(logo.dataUrl, 'PNG', M, y, w, h); } catch { /* skip */ }
  }
  const tx = logo ? M + 44 : M;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30);
  doc.text(org?.nombre || 'OMEGA', tx, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
  const sub = [org?.contacto, org?.direccion].filter(Boolean).join('  ·  ');
  if (sub) doc.text(doc.splitTextToSize(sub, pageW - tx - M), tx, y + 12);
  y += 22;
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.8); doc.line(M, y, pageW - M, y);
  doc.setLineWidth(0.2);
  y += 9;

  // ── Título + fecha ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...ACCENT);
  const tLines = doc.splitTextToSize(titulo, pageW - M * 2);
  doc.text(tLines, M, y);
  y += (tLines.length - 1) * 6 + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150);
  doc.text('Generado: ' + new Date().toLocaleString('es-ES'), M, y);
  doc.setTextColor(30);
  y += 9;

  for (const b of bloques) {
    // Barra de sección
    if (b.heading) {
      ensure(14);
      doc.setFillColor(238, 242, 248);
      doc.rect(M, y - 4.5, pageW - M * 2, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...ACCENT);
      doc.text(b.heading, M + 2.5, y + 1);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
      y += 11;
    }

    if (b.lines?.length) {
      doc.setFontSize(9);
      for (const l of b.lines) {
        const s = String(l);
        const idx = s.indexOf(': ');
        if (idx > 0 && idx <= 30) {
          // Par etiqueta/valor → etiqueta gris + valor oscuro en dos columnas
          const label = s.slice(0, idx + 1);
          const valLines = doc.splitTextToSize(s.slice(idx + 2), pageW - M - LABEL_W - M);
          ensure(5 * valLines.length);
          doc.setTextColor(120); doc.text(label, M + 2, y);
          doc.setTextColor(30);  doc.text(valLines, M + LABEL_W, y);
          y += 5 * valLines.length;
        } else {
          // Texto libre (p.ej. motivación) → ancho completo
          for (const wl of doc.splitTextToSize(s, pageW - M * 2 - 2)) { ensure(5); doc.text(wl, M + 2, y); y += 5; }
        }
      }
      y += 4;
    }

    if (b.table) {
      doc.autoTable({
        head: [b.table.columns], body: b.table.rows, startY: y,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: 40, lineColor: [226, 232, 240] },
        headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 9;
    }
  }

  // ── Pie de página con numeración ──
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(org?.nombre || 'OMEGA', M, pageH - 8);
    doc.text(`Página ${i} de ${total}`, pageW - M, pageH - 8, { align: 'right' });
  }

  doc.save(filename);
}

// ── Excel (SheetJS) ───────────────────────────────────────────
export async function exportExcel(filename, sheetName, columns, rows) {
  const XLSX = await ensureXLSX();
  const aoa = [columns.map(c => c.label), ...matrix(columns, rows)];
  const ws  = XLSX.utils.aoa_to_sheet(aoa);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
