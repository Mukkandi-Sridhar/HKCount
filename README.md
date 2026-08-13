# 🪷 Gita4youth — Hare Krishna Chant Counter

A **client-only PWA** that counts how many times each participant said "Hare Krishna"
(in any language or spelling) in a WhatsApp group chat export.

**Your chat data never leaves your device.** Everything runs in the browser.

---

## Features

- 📁 **Upload WhatsApp exports** — `.txt` or `.zip` (with media), drag-and-drop or file picker
- 📱 **Web Share Target** — install as a PWA on Android and Gita4youth appears in WhatsApp's share sheet
- 🌐 **Multi-script detection** — English, Devanagari, Telugu, Tamil, Kannada, Bengali, Gujarati
- 🔍 **Fuzzy matching** — catches typos like "Hre Krishna", "Haree Krishnaa", etc.
- 🔢 **Two counting modes** — count every repetition, or once per message
- 📊 **Sortable results table** — rank, name/phone, chant count, messages with matches
- 🔎 **Drill-down view** — tap any row to see the actual matched messages
- 🤝 **Contact merge** — merge rows for the same person who appears under two identities
- 📤 **Export** — PDF (Gita4youth-branded), CSV, copy-to-clipboard
- ⚙️ **Settings** — counting mode, loose matching (HK/HKHK), redact phone numbers in exports
- 🔒 **100% private** — no server, no analytics, no network requests

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 10+

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Tests

```bash
npm test           # Run all unit tests
npm run test:watch # Watch mode
```

### Production build

```bash
npm run build
npm run preview    # Preview the production build locally
```

---

## Deploying (required for Android Share Target)

The PWA's Web Share Target feature **requires HTTPS**. Use any of these free hosts:

### Netlify (recommended)
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### GitHub Pages
1. Push to GitHub
2. In repo Settings → Pages → set source to `gh-pages` branch (or GitHub Actions)
3. Add this to `vite.config.ts`: `base: '/your-repo-name/'`

### Cloudflare Pages
Connect your GitHub repo in the Cloudflare Pages dashboard. Build command: `npm run build`, output: `dist`.

---

## How to use (Android)

1. Open the app URL in Chrome on Android → tap ⋮ → **Add to Home screen**
2. Open your WhatsApp group → ⋮ → **More** → **Export chat** → **Without media**
3. In the share sheet, tap **Gita4youth**
4. Done — results appear automatically

## How to use (iOS / any platform)

1. Export the WhatsApp chat to Files
2. Open Gita4youth in Safari → tap Share → **Add to Home Screen** (for offline use)
3. Open Gita4youth → tap **Browse file** → pick the `.txt` or `.zip` file
4. Done

---

## Adding new spelling variants

Edit [`src/lib/matcher-config.ts`](src/lib/matcher-config.ts):
- Add to `CANONICAL_SPELLINGS` for fuzzy-matching coverage
- Add a regex to `LATIN_REGEX` for exact Latin matching
- Add a new entry to `SCRIPT_PATTERNS` for a new script

Run `npm test` after editing — the counter tests will catch regressions.

---

## Project structure

```
src/
├── lib/
│   ├── matcher-config.ts   ← All patterns (edit here to add variants)
│   ├── parser.ts           ← WhatsApp export parser
│   ├── counter.ts          ← Counting engine
│   ├── zipper.ts           ← .zip extraction
│   ├── exporter.ts         ← PDF/CSV export
│   └── __tests__/          ← Unit tests + fixtures
├── components/
│   ├── UploadScreen.tsx
│   ├── ProcessingScreen.tsx
│   ├── ResultsScreen.tsx
│   ├── DrillDownPanel.tsx
│   ├── MergeDialog.tsx
│   ├── ExportBar.tsx
│   └── SettingsPanel.tsx
├── context/
│   └── AppContext.tsx       ← Global state
├── hooks/
│   └── useToast.ts
├── App.tsx
├── main.tsx
└── index.css               ← Design system
```

---

## Privacy

- No server. No database. No analytics.
- The WhatsApp export is processed entirely in your browser's JavaScript engine.
- Nothing is sent over the network.
- If you close the tab, all data is gone (unless you've exported it first).

---

*Built with React + Vite + vite-plugin-pwa. Dedicated to the Vaishnava community. Hare Krishna! 🪷*
