import React, { useEffect, useState } from 'react';

interface InstallGateProps {
  onInstalled: () => void;
}

export function InstallGate({ onInstalled }: InstallGateProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    // 2. Detect standalone mode
    const checkStandalone = () => {
      const isAndroidChromeStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isSafariStandalone = (window.navigator as any).standalone === true;
      const stands = isAndroidChromeStandalone || isSafariStandalone;
      setIsStandalone(stands);
      if (stands) {
        onInstalled();
      }
    };

    checkStandalone();
    
    // Listen for changes in display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    // 3. Listen for beforeinstallprompt (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, [onInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <div 
      className="upload-screen animate-in" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999, 
        background: 'var(--clr-bg)',
        overflowY: 'auto'
      }}
    >
      <div className="upload-hero" style={{ maxWidth: '480px', margin: '0 auto', padding: 'var(--gap-lg)' }}>
        <div className="logo-mark" aria-hidden="true" style={{ fontSize: '3rem' }}>🪷</div>
        <h1 className="logo-title" style={{ fontSize: '3rem', margin: '16px 0 8px' }}>Gita4youth</h1>
        <p className="logo-tagline" style={{ fontSize: '1rem', color: 'var(--clr-text-muted)', marginBottom: '32px' }}>
          WhatsApp Hare Krishna Chant Counter
        </p>

        <CardContainer>
          <div className="space-y-4 text-center">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-saffron-text)' }}>
              Installation Required
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--clr-text)', lineHeight: 1.5 }}>
              To ensure 100% privacy, Gita4youth runs offline on your device and accepts chat exports directly. It must be installed as an app to be used.
            </p>

            <div style={{ margin: '24px 0' }}>
              {isIOS ? (
                /* iOS Instructions */
                <div style={{ textAlign: 'left', background: 'var(--clr-surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px', color: 'var(--clr-text)' }}>
                    How to install on iPhone / iPad:
                  </p>
                  <ol style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      Open this page in <strong>Safari browser</strong> if you aren't currently.
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-saffron-text)', marginTop: '2px' }}>
                        * If using Chrome, tap the Share icon or menu and choose <strong>Open in Safari</strong> first.
                      </div>
                    </li>
                    <li>
                      Tap the <strong>Share button</strong> <span style={{ fontSize: '1.2rem' }}>⎋</span> at the bottom of Safari.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Launch <strong>Gita4youth</strong> from your home screen.
                    </li>
                  </ol>
                  
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--clr-border)', paddingTop: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-subtle)', marginBottom: '8px' }}>
                      Already installed it on your device?
                    </p>
                    <a 
                      href="gita4youth://" 
                      className="btn btn-secondary w-full"
                      style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      Open installed Gita4youth app
                    </a>
                  </div>
                </div>
              ) : (
                /* Android / Desktop Chrome Path */
                <div className="space-y-4">
                  <button
                    onClick={handleInstallClick}
                    disabled={!deferredPrompt}
                    className="btn btn-primary w-full"
                    style={{ justifyContent: 'center', height: '48px', fontSize: '1rem' }}
                  >
                    ✨ Install Gita4youth App
                  </button>
                  
                  {!deferredPrompt && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                      If the button is disabled, click the browser's menu (three dots) and select <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContainer>
      </div>
    </div>
  );
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="card" 
      style={{ 
        background: 'var(--clr-surface)', 
        border: '1px solid var(--clr-border)',
        borderRadius: 'var(--r-lg)',
        padding: '24px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {children}
    </div>
  );
}
