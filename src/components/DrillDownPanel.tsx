/**
 * DrillDownPanel.tsx
 * Modal/bottom-sheet showing matched lines for a selected sender.
 */

import React, { useEffect } from 'react';
import type { SenderStats, MatchedLine } from '../lib/counter';

interface Props {
  sender: SenderStats;
  onClose: () => void;
}

/** Highlight matched spans within a line of text. */
function HighlightedLine({ line }: { line: MatchedLine }) {
  if (!line.spans || line.spans.length === 0) {
    return <span>{line.text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  // Sort spans by start position
  const sorted = [...line.spans].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sorted) {
    if (start > cursor) {
      parts.push(<span key={cursor}>{line.text.slice(cursor, start)}</span>);
    }
    parts.push(
      <mark key={start} className="highlight">
        {line.text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }

  if (cursor < line.text.length) {
    parts.push(<span key={cursor}>{line.text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}

export function DrillDownPanel({ sender, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drill-down-title"
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h3 id="drill-down-title" style={{ fontFamily: 'var(--font-heading)' }}>
              {sender.displayName}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginTop: 2 }}>
              {sender.totalCount} chants across {sender.messageCount} messages
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close"
            id="drill-down-close-btn"
          >
            ✕
          </button>
        </div>

        <div className="modal-body" role="list" aria-label="Matched messages">
          {sender.matchedLines.length === 0 ? (
            <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
              No matched lines to show.
            </p>
          ) : (
            sender.matchedLines.map((line, i) => (
              <div
                key={i}
                className="matched-line"
                role="listitem"
                aria-label={`Message ${i + 1}: ${line.text}`}
              >
                {line.count > 1 && (
                  <span className="matched-line-count" aria-label={`${line.count} chants in this message`}>
                    ×{line.count}
                  </span>
                )}
                <HighlightedLine line={line} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
