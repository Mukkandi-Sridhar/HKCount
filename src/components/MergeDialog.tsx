/**
 * MergeDialog.tsx
 * When 2+ rows are selected: choose which display name to keep, then merge.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { SenderStats } from '../lib/counter';

interface Props {
  entries: SenderStats[];
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function MergeDialog({ entries, onClose, onToast }: Props) {
  const { mergeEntries } = useApp();
  const [keepId, setKeepId] = useState(entries[0].id);

  const handleMerge = () => {
    const ids = entries.map((e) => e.id);
    mergeEntries(ids, keepId);
    onToast(`Merged ${entries.length} entries into "${keepId}"`, 'success');
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-dialog-title"
    >
      <div className="modal-panel">
        <div className="modal-header">
          <h3 id="merge-dialog-title" style={{ fontFamily: 'var(--font-heading)' }}>
            Merge contacts
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close" id="merge-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: 16 }}>
            These entries may represent the same person (one saved as a name, another as a phone number).
            Choose which display name to keep after merging:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map((e) => (
              <div
                key={e.id}
                className={`merge-option${keepId === e.id ? ' selected' : ''}`}
                onClick={() => setKeepId(e.id)}
                role="radio"
                aria-checked={keepId === e.id}
                tabIndex={0}
                onKeyDown={(ev) => ev.key === 'Enter' && setKeepId(e.id)}
                id={`merge-option-${e.id.replace(/\W/g, '-')}`}
              >
                <div className="merge-option-radio" aria-hidden="true" />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{e.displayName}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                    {e.totalCount} chants · {e.messageCount} messages
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose} id="merge-cancel-btn">Cancel</button>
            <button className="btn btn-primary" onClick={handleMerge} id="merge-confirm-btn">
              Merge {entries.length} entries
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
