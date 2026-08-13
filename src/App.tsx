/**
 * App.tsx
 * Root component — routes between screens, owns toast state.
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { useToast } from './hooks/useToast';

function Navbar() {
  const { screen, setScreen, reset } = useApp();

  return (
    <nav className="navbar" role="navigation" aria-label="Githa navigation">
      <button
        className="navbar-logo"
        onClick={() => screen === 'results' ? null : reset()}
        aria-label="Githa home"
        id="navbar-logo-btn"
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        <span aria-hidden="true">🪷</span>
        Githa
      </button>

      <div className="navbar-actions">
        {screen === 'results' && (
          <button
            className="btn btn-ghost"
            onClick={() => setScreen('settings')}
            id="navbar-settings-btn"
            aria-label="Open settings"
          >
            ⚙️ Settings
          </button>
        )}
        {screen === 'settings' && (
          <button
            className="btn btn-ghost"
            onClick={() => setScreen('results')}
            id="navbar-back-btn"
            aria-label="Back to results"
          >
            ← Back
          </button>
        )}
      </div>
    </nav>
  );
}

import { InstallGate } from './components/InstallGate';

function AppInner() {
  const { screen } = useApp();
  const { toasts, show: showToast } = useToast();
  const [installed, setInstalled] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const isAndroidChromeStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isSafariStandalone = (window.navigator as any).standalone === true;
    return isAndroidChromeStandalone || isSafariStandalone;
  });

  const showNavbar = screen === 'results' || screen === 'settings';

  if (!installed) {
    return (
      <div className="app">
        <InstallGate onInstalled={() => setInstalled(true)} />
      </div>
    );
  }

  return (
    <div className="app">
      {showNavbar && <Navbar />}

      {screen === 'upload'      && <UploadScreen onToast={showToast} />}
      {screen === 'processing'  && <ProcessingScreen />}
      {screen === 'results'     && <ResultsScreen onToast={showToast} />}
      {screen === 'settings'    && <SettingsPanel />}

      {/* Toast container */}
      <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
