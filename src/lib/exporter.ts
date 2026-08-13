/**
 * exporter.ts
 *
 * PDF and CSV export for Githa results.
 *
 * Public API:
 *   exportCSV(stats, options)
 *   exportPDF(stats, meta, options)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SenderStats } from './counter';

export interface ExportMeta {
  groupName?: string;
  generatedOn?: Date;
  totalMessages?: number;
}

export interface ExportOptions {
  redactPhoneNumbers: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitiseName(name: string, opts: ExportOptions): string {
  if (!opts.redactPhoneNumbers) return name;
  // Replace phone-like strings with ***
  return name.replace(/\+?[\d\s\-().]{7,}/g, '***');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function exportCSV(stats: SenderStats[], opts: ExportOptions): void {
  const header = ['Rank', 'Name / Phone', 'Chant Count', 'Messages with Match'];
  const rows = stats.map((s, i) => [
    String(i + 1),
    sanitiseName(s.displayName, opts),
    String(s.totalCount),
    String(s.messageCount),
  ]);

  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `githa-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Copy as text (tab-separated)
// ---------------------------------------------------------------------------

export function copyAsText(stats: SenderStats[], opts: ExportOptions): string {
  const header = 'Rank\tName / Phone\tChant Count\tMessages\n';
  const rows = stats
    .map(
      (s, i) =>
        `${i + 1}\t${sanitiseName(s.displayName, opts)}\t${s.totalCount}\t${s.messageCount}`
    )
    .join('\n');
  return header + rows;
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

export function exportPDF(stats: SenderStats[], meta: ExportMeta, opts: ExportOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const saffron: [number, number, number] = [245, 166, 35];
  const darkGray: [number, number, number] = [30, 30, 30];
  const lightGray: [number, number, number] = [245, 245, 245];

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...darkGray);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...saffron);
  doc.text('Githa', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('Hare Krishna Chant Counter', margin, 22);

  // ── Meta row ─────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);

  let metaY = 34;

  if (meta.groupName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Group:', margin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(meta.groupName, margin + 16, metaY);
    metaY += 6;
  }

  const generated = meta.generatedOn ?? new Date();
  doc.setFont('helvetica', 'bold');
  doc.text('Generated:', margin, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(generated), margin + 22, metaY);
  metaY += 6;

  if (meta.totalMessages !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Messages scanned:', margin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(meta.totalMessages), margin + 40, metaY);
    metaY += 6;
  }

  // Total chants summary
  const grandTotal = stats.reduce((s, r) => s + r.totalCount, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Total chants found:', margin, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(String(grandTotal), margin + 40, metaY);
  metaY += 8;

  // ── Results table ─────────────────────────────────────────────────────────
  const tableRows = stats.map((s, i) => [
    String(i + 1),
    sanitiseName(s.displayName, opts),
    String(s.totalCount),
    String(s.messageCount),
  ]);

  autoTable(doc, {
    head: [['Rank', 'Name / Phone', 'Chant Count', 'Messages']],
    body: tableRows,
    startY: metaY,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: {
      fillColor: darkGray,
      textColor: saffron,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 28 },
    },
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Githa — githa.app  |  Page ${p} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  doc.save(`githa-results-${Date.now()}.pdf`);
}
