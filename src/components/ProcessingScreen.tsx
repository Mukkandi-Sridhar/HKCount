/**
 * ProcessingScreen.tsx
 * Animated progress indicator shown while parsing and counting.
 */

import React from 'react';
import { useApp } from '../context/AppContext';

export function ProcessingScreen() {
  const { progress } = useApp();

  const phaseLabel =
    progress.phase === 'parsing'
      ? 'Reading chat export…'
      : progress.phase === 'counting'
      ? 'Counting chants…'
      : 'All done!';

  return (
    <main className="processing-screen" role="main" aria-live="polite">
      <div className="processing-icon" aria-hidden="true">🪷</div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
          Analysing your chat
        </h2>
        <p className="text-muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>
          Everything runs on your device — your data never leaves this browser.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
        <div className="progress-bar-wrap" role="progressbar" aria-valuenow={progress.progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="progress-bar-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <p className="processing-phase">{phaseLabel}</p>

        {progress.messageCount > 0 && (
          <div className="processing-stats-row">
            <span>{progress.messageCount.toLocaleString()} messages found</span>
          </div>
        )}
      </div>
    </main>
  );
}
