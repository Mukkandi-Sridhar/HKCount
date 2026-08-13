/**
 * ExportBar.tsx
 * Copy / CSV / PDF export actions for the results screen.
 */

import React, { useState } from 'react';
import { exportCSV, exportPDF, copyAsText } from '../lib/exporter';
import { useApp } from '../context/AppContext';

interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ExportBar({ onToast }: Props) {
  const { results, settings, groupName, totalMessages } = useApp();
  const [loading, setLoading] = useState<string | null>(null);

  const opts = { redactPhoneNumbers: settings.redactPhoneNumbers };

  const handleCopy = async () => {
    const text = copyAsText(results, opts);
    await navigator.clipboard.writeText(text);
    onToast('Copied to clipboard', 'success');
  };

  const handleCSV = () => {
    setLoading('csv');
    try {
      exportCSV(results, opts);
      onToast('CSV downloaded', 'success');
    } catch {
      onToast('Failed to export CSV', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handlePDF = () => {
    setLoading('pdf');
    try {
      exportPDF(results, {
        groupName: groupName || undefined,
        generatedOn: new Date(),
        totalMessages,
      }, opts);
      onToast('PDF downloaded', 'success');
    } catch {
      onToast('Failed to export PDF', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="export-bar" role="toolbar" aria-label="Export options">
      <span className="export-label">Export</span>

      <button
        className="btn btn-secondary"
        onClick={handleCopy}
        disabled={loading !== null}
        id="export-copy-btn"
        aria-label="Copy results to clipboard"
      >
        📋 Copy
      </button>

      <button
        className="btn btn-secondary"
        onClick={handleCSV}
        disabled={loading !== null}
        id="export-csv-btn"
        aria-label="Download results as CSV"
      >
        {loading === 'csv' ? '⏳' : '📊'} CSV
      </button>

      <button
        className="btn btn-secondary"
        onClick={handlePDF}
        disabled={loading !== null}
        id="export-pdf-btn"
        aria-label="Download results as PDF"
      >
        {loading === 'pdf' ? '⏳' : '📄'} PDF
      </button>
    </div>
  );
}
