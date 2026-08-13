/**
 * ResultsScreen.tsx
 * Sortable, searchable results table with row drill-down and merge UI.
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { SenderStats } from '../lib/counter';
import { DrillDownPanel } from './DrillDownPanel';
import { MergeDialog } from './MergeDialog';
import { ExportBar } from './ExportBar';

type SortKey = 'rank' | 'name' | 'count' | 'messages';
type SortDir = 'asc' | 'desc';

function rankBadgeClass(rank: number) {
  if (rank === 1) return 'rank-badge gold';
  if (rank === 2) return 'rank-badge silver';
  if (rank === 3) return 'rank-badge bronze';
  return 'rank-badge';
}

interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ResultsScreen({ onToast }: Props) {
  const {
    results,
    selectedIds,
    toggleSelected,
    clearSelected,
    groupName,
    setGroupName,
    totalMessages,
    reset,
    setScreen,
  } = useApp();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [drillDown, setDrillDown] = useState<SenderStats | null>(null);
  const [showMerge, setShowMerge] = useState(false);

  // ── Filtering + sorting ────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let rows = results;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.phoneNumber?.toLowerCase().includes(q)
      );
    }

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === 'count') cmp = b.totalCount - a.totalCount;
      else if (sortKey === 'messages') cmp = b.messageCount - a.messageCount;
      return sortDir === 'asc' ? -cmp : cmp;
    });

    return rows;
  }, [results, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  // ── Summary stats ──────────────────────────────────────────────────────
  const grandTotal = results.reduce((s, r) => s + r.totalCount, 0);
  const senderCount = results.length;

  // ── Selection helpers ──────────────────────────────────────────────────
  const selectedEntries = results.filter((r) => selectedIds.has(r.id));

  return (
    <div className="results-screen">
      {/* ─── Summary chips ───────────────────────────────────────────────── */}
      <div className="results-header">
        {/* Group name banner */}
        <div className="group-name-banner animate-in">
          <span>Group:</span>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name (for PDF)"
            aria-label="Group name for PDF export"
            id="group-name-input"
          />
        </div>

        <div className="results-summary animate-in animate-in-delay-1">
          <div className="stat-chip">
            <div className="stat-chip-value">{grandTotal.toLocaleString()}</div>
            <div className="stat-chip-label">Total chants</div>
          </div>
          <div className="stat-chip">
            <div className="stat-chip-value">{senderCount}</div>
            <div className="stat-chip-label">Participants</div>
          </div>
          <div className="stat-chip">
            <div className="stat-chip-value">{totalMessages.toLocaleString()}</div>
            <div className="stat-chip-label">Messages scanned</div>
          </div>
          {results[0] && (
            <div className="stat-chip" style={{ borderColor: 'rgba(245,166,35,0.3)', background: 'var(--clr-saffron-glow)' }}>
              <div className="stat-chip-value">{results[0].totalCount}</div>
              <div className="stat-chip-label" style={{ color: 'var(--clr-saffron-text)' }}>
                🏆 {results[0].displayName}
              </div>
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="results-controls animate-in animate-in-delay-2">
          <input
            className="input"
            type="search"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search participants"
            id="results-search-input"
          />
          <button
            className="btn btn-secondary"
            onClick={() => { reset(); }}
            id="results-new-btn"
            title="Upload a new file"
            aria-label="Upload new chat export"
          >
            ↑ New file
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setScreen('settings')}
            id="results-settings-btn"
            aria-label="Open settings"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Merge bar */}
        {selectedIds.size >= 2 && (
          <div className="merge-bar">
            <span style={{ flex: 1, fontSize: '0.875rem' }}>
              {selectedIds.size} entries selected
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setShowMerge(true)}
              id="merge-selected-btn"
            >
              Merge contacts
            </button>
            <button className="btn btn-ghost" onClick={clearSelected} id="merge-clear-btn">
              Clear
            </button>
          </div>
        )}

        {/* Unattributed messages notice */}
        {(() => {
          const unattributedCount = parseInt(localStorage.getItem('gita4youth_unattributed_messages_count') || '0', 10);
          if (unattributedCount === 0) return null;
          return (
            <div 
              className="card animate-in" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                borderColor: 'rgba(239, 68, 68, 0.25)', 
                padding: '12px 16px',
                borderRadius: 'var(--r-md)',
                fontSize: '0.8rem',
                color: 'var(--clr-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚠️</span>
              <span>
                <strong>Heuristic Notice:</strong> {unattributedCount} lines lacked bracketed timestamps in the export. Gita4youth recovered them by attributing to their nearest sender, but 100% accuracy is not guaranteed.
              </span>
            </div>
          );
        })()}

        {/* Export bar */}
        <ExportBar onToast={onToast} />
      </div>

      {/* ─── Results table ────────────────────────────────────────────────── */}
      <div className="results-body animate-in animate-in-delay-2">
        {displayed.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</p>
            <p className="text-muted">
              {search ? 'No participants match your search.' : 'No chants found in this chat export.'}
            </p>
          </div>
        ) : (
          <div className="results-table-wrap" role="region" aria-label="Chant count results">
            <table className="results-table" aria-label="Hare Krishna chant counts by participant">
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort('rank')}
                    className={sortKey === 'rank' ? 'sorted' : ''}
                    aria-sort={sortKey === 'rank' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    scope="col"
                    id="col-rank"
                  >
                    Rank<span className="sort-indicator">{sortIndicator('rank')}</span>
                  </th>
                  <th
                    onClick={() => toggleSort('name')}
                    className={sortKey === 'name' ? 'sorted' : ''}
                    aria-sort={sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    scope="col"
                    id="col-name"
                  >
                    Name / Phone<span className="sort-indicator">{sortIndicator('name')}</span>
                  </th>
                  <th
                    onClick={() => toggleSort('count')}
                    className={sortKey === 'count' ? 'sorted' : ''}
                    aria-sort={sortKey === 'count' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    scope="col"
                    id="col-count"
                  >
                    Chants<span className="sort-indicator">{sortIndicator('count')}</span>
                  </th>
                  <th
                    onClick={() => toggleSort('messages')}
                    className={sortKey === 'messages' ? 'sorted' : ''}
                    aria-sort={sortKey === 'messages' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    scope="col"
                    id="col-messages"
                  >
                    Messages<span className="sort-indicator">{sortIndicator('messages')}</span>
                  </th>
                  <th scope="col" id="col-select" style={{ width: 48 }}>
                    <span className="sr-only">Select</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((stat, idx) => {
                  // Rank by original sort (count desc)
                  const rank = results.indexOf(stat) + 1;
                  const isSelected = selectedIds.has(stat.id);

                  return (
                    <tr
                      key={stat.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setDrillDown(stat)}
                      aria-label={`${stat.displayName}: ${stat.totalCount} chants in ${stat.messageCount} messages. Click to see matched messages.`}
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      <td>
                        <span className={rankBadgeClass(rank)} aria-label={`Rank ${rank}`}>
                          {rank}
                        </span>
                      </td>
                      <td>
                        <div className="sender-name">{stat.displayName}</div>
                        {stat.phoneNumber && stat.displayName !== stat.phoneNumber && (
                          <div className="sender-phone">{stat.phoneNumber}</div>
                        )}
                      </td>
                      <td>
                        <span className="count-value">{stat.totalCount.toLocaleString()}</span>
                      </td>
                      <td style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                        {stat.messageCount}
                      </td>
                      <td
                        onClick={(e) => { e.stopPropagation(); toggleSelected(stat.id); }}
                        style={{ textAlign: 'center' }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(stat.id)}
                          aria-label={`Select ${stat.displayName} for merge`}
                          id={`select-${stat.id.replace(/\W/g, '-')}`}
                          style={{ accentColor: 'var(--clr-saffron)', width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        {results.length > 0 && (
          <p className="text-subtle" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: 12 }}>
            Tap any row to see matched messages · Select 2+ rows to merge duplicate contacts
          </p>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {drillDown && (
        <DrillDownPanel
          sender={drillDown}
          onClose={() => setDrillDown(null)}
        />
      )}

      {showMerge && selectedEntries.length >= 2 && (
        <MergeDialog
          entries={selectedEntries}
          onClose={() => setShowMerge(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
