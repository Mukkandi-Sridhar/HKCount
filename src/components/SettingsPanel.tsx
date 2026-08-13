/**
 * SettingsPanel.tsx
 * Counting rule, loose matching, and redact phone numbers toggles.
 */

import React from 'react';
import { useApp } from '../context/AppContext';

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
}

export function SettingsPanel() {
  const { settings, setSettings } = useApp();

  return (
    <section className="settings-screen" aria-label="Settings">
      <div className="animate-in">
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 4 }}>Settings</h2>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
          Changes apply the next time you upload a file.
        </p>
      </div>

      {/* Counting rule */}
      <div className="settings-group animate-in animate-in-delay-1">
        <div className="settings-group-title">Counting rule</div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Count every repetition</strong>
            <span>
              "Hare Krishna Hare Krishna" in one message = 2.
              Recommended for group chant tracking.
            </span>
          </div>
          <Toggle
            id="settings-every-occurrence"
            checked={settings.mode === 'every-occurrence'}
            onChange={(v) => setSettings({ mode: v ? 'every-occurrence' : 'once-per-message' })}
          />
        </div>

        <div className="settings-row" style={{ background: 'var(--clr-surface-2)' }}>
          <div className="settings-row-label" style={{ opacity: settings.mode === 'once-per-message' ? 1 : 0.5 }}>
            <strong>Count once per message</strong>
            <span>
              Any message containing "Hare Krishna" counts as 1, regardless of how many times
              it appears in that message.
            </span>
          </div>
        </div>
      </div>

      {/* Matching */}
      <div className="settings-group animate-in animate-in-delay-2">
        <div className="settings-group-title">Matching</div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Loose matching</strong>
            <span>
              Also count "HK" and "HKHK" as shorthand for Hare Krishna.
              Off by default to avoid false positives.
            </span>
          </div>
          <Toggle
            id="settings-loose-matching"
            checked={settings.looseMatching}
            onChange={(v) => setSettings({ looseMatching: v })}
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="settings-group animate-in animate-in-delay-3">
        <div className="settings-group-title">Privacy</div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Redact phone numbers in exports</strong>
            <span>
              Replace phone numbers with *** in PDF/CSV exports so you can share
              results publicly without exposing contact details.
            </span>
          </div>
          <Toggle
            id="settings-redact-phones"
            checked={settings.redactPhoneNumbers}
            onChange={(v) => setSettings({ redactPhoneNumbers: v })}
          />
        </div>
      </div>

      {/* About */}
      <div className="settings-group animate-in animate-in-delay-3">
        <div className="settings-group-title">About</div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <strong style={{ fontSize: '1rem' }}>🪷 Gita4youth v1.0.0</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', lineHeight: 1.6 }}>
            A client-only PWA — your WhatsApp export never leaves your device.
            Built with React + Vite. Supports English, Devanagari, Telugu, Tamil,
            Kannada, Bengali, and Gujarati chant detection.
          </span>
        </div>
      </div>
    </section>
  );
}
