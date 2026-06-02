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
  let y = 12;

  const logo = await loadLogo(org?.logo_url);
  if (logo) {
    const h = 16, w = Math.min(40, (logo.w / logo.h) * h);
    try { doc.addImage(logo.dataUrl, 'PNG', 14, y, w, h); } catch { /* skip */ }
  }
  const tx = logo ? 58 : 14;
  doc.setFontSize(13); doc.setTextColor(20);
  doc.text(org?.nombre || 'Proyecto OMEGA', tx, y + 6);
  const sub = [org?.contacto, org?.direccion].filter(Boolean).join('  ·  ');
  if (sub) { doc.setFontSize(9); doc.setTextColor(120); doc.text(sub, tx, y + 12); }
  y += 22;

  doc.setTextColor(20); doc.setFontSize(12); doc.text(titulo, 14, y);
  doc.setDrawColor(220); doc.line(14, y + 3, pageW - 14, y + 3);
  doc.setFontSize(8); doc.setTextColor(140);
  doc.text('Generado: ' + new Date().toLocaleString('es-ES'), 14, y + 9);
  doc.setTextColor(20);
  y += 16;

  for (const b of bloques) {
    if (y > 265) { doc.addPage(); y = 16; }
    if (b.heading) { doc.setFontSize(11); doc.text(b.heading, 14, y); y += 6; }
    if (b.lines?.length) {
      doc.setFontSize(9);
      for (const l of b.lines) { if (y > 282) { doc.addPage(); y = 16; } doc.text(String(l), 16, y); y += 5; }
      y += 3;
    }
    if (b.table) {
      doc.autoTable({
        head: [b.table.columns], body: b.table.rows, startY: y,
        styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [55, 138, 221] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }
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
