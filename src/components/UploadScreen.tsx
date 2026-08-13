/**
 * UploadScreen.tsx
 *
 * Entry point for the app:
 *  - Drag-and-drop / click-to-upload zone (.txt or .zip)
 *  - Auto-processing when a file arrives via Web Share Target
 *  - How-to-use tips
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { extractChatText } from '../lib/zipper';
import { parseWhatsAppExport } from '../lib/parser';
import { countChants } from '../lib/counter';

interface UploadScreenProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function UploadScreen({ onToast }: UploadScreenProps) {
  const { setScreen, setResults, setProgress, settings } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Process a file ──────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      try {
        setScreen('processing');
        setProgress({ phase: 'parsing', progress: 10, messageCount: 0 });

        const text = await extractChatText(file);

        setProgress({ phase: 'parsing', progress: 40, messageCount: 0 });

        // Parse runs synchronously; yield to UI between phases
        await new Promise<void>((r) => setTimeout(r, 0));
        const messages = parseWhatsAppExport(text);

        setProgress({ phase: 'counting', progress: 65, messageCount: messages.length });

        await new Promise<void>((r) => setTimeout(r, 0));
        const stats = countChants(messages, settings);

        setProgress({ phase: 'done', progress: 100, messageCount: messages.length });
        await new Promise<void>((r) => setTimeout(r, 400));

        setResults(stats, messages.length);
        setScreen('results');
        onToast(`Found ${stats.reduce((s, r) => s + r.totalCount, 0)} chants from ${stats.length} senders`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process file';
        onToast(msg, 'error');
        setScreen('upload');
      }
    },
    [settings, setScreen, setResults, setProgress, onToast]
  );

  // ── Web Share Target: read shared file from Cache Storage ──────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share-target')) {
      const readSharedFile = async () => {
        try {
          const cache = await caches.open('gita4youth-share-target');
          const response = await cache.match('/shared-file');
          if (response) {
            const blob = await response.blob();
            const filenameHeader = response.headers.get('x-filename');
            const filename = filenameHeader ? decodeURIComponent(filenameHeader) : 'shared_chat.zip';
            const file = new File([blob], filename, { type: response.headers.get('content-type') || 'application/zip' });
            
            // Clean up cache and URL query params
            await cache.delete('/shared-file');
            window.history.replaceState({}, document.title, window.location.pathname);
            
            processFile(file);
          }
        } catch (err) {
          console.error('Failed to read shared file from Cache Storage:', err);
        }
      };

      readSharedFile();
    }
  }, [processFile]);

  // ── Drag and drop ────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <main className="upload-screen" role="main">
      {/* Hero */}
      <div className="upload-hero animate-in">
        <div className="logo-mark" aria-hidden="true">🪷</div>
        <h1 className="logo-title">Gita4youth</h1>
        <p className="logo-tagline">
          Count "Hare Krishna" chants in your WhatsApp group chat — privately, on‑device.
        </p>
      </div>

      {/* Drop zone */}
      <div className="dropzone animate-in animate-in-delay-1">
        <div
          className={`dropzone-inner${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload WhatsApp chat export file"
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          id="upload-dropzone"
        >
          <span className="dropzone-icon">📁</span>
          <p className="dropzone-title">Drop your chat export here</p>
          <p className="dropzone-sub">Supports .txt and .zip files from WhatsApp</p>
          <div className="dropzone-divider">or</div>
          <button
            className="btn btn-primary"
            id="upload-browse-btn"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            type="button"
          >
            Browse file
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.zip"
          style={{ display: 'none' }}
          onChange={onFileChange}
          id="upload-file-input"
          aria-label="Select WhatsApp chat export file"
        />
      </div>

      {/* Tips */}
      <div className="upload-tips animate-in animate-in-delay-2">
        <div className="tips-grid">
          <div className="tip-card">
            <strong>📱 Android</strong>
            Open WhatsApp group → ⋮ → More → Export chat → Share to Gita4youth
          </div>
          <div className="tip-card">
            <strong>🍎 iPhone</strong>
            Open group → Group name → Export Chat → Save to Files → upload here
          </div>
          <div className="tip-card">
            <strong>🔒 100% private</strong>
            Your chat never leaves this device. Everything runs in your browser.
          </div>
          <div className="tip-card">
            <strong>📦 Zip OK</strong>
            "Export with media" creates a .zip — Gita4youth handles that too, ignoring the media.
          </div>
        </div>
      </div>
    </main>
  );
}
