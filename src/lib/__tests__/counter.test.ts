import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseWhatsAppExport } from '../parser';
import { countChants } from '../counter';
import type { CountOptions } from '../counter';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf-8');

const everyOccurrence: CountOptions = { mode: 'every-occurrence', looseMatching: false };
const oncePerMessage: CountOptions = { mode: 'once-per-message', looseMatching: false };
const looseEvery: CountOptions = { mode: 'every-occurrence', looseMatching: true };

// ---------------------------------------------------------------------------
// English / Latin variants
// ---------------------------------------------------------------------------
describe('countChants — English variants', () => {
  const cases: Array<[string, number]> = [
    ['Hare Krishna', 1],
    ['hare krishna', 1],
    ['Hare Krshna', 1],
    ['Hare Krsna', 1],
    ['Haree Krishna', 1],
    ['Hari Krishna', 1],
    ['Hare Krishnaa', 1],
    ['Hare Krishnam', 1],
    ['HareKrishna', 1],          // no space
    ['Hare  Krishna', 1],        // double space
    ['Hre Krishna', 1],          // missing 'a'
    ['HARE KRISHNA', 1],         // all caps
    ['Hare Krishna Hare Krishna', 2], // repeated
    ['Hare Krishna Hare Krishna Hare Krishna Hare Krishna', 4], // x4
  ];

  for (const [text, expected] of cases) {
    it(`counts "${text}" as ${expected}`, () => {
      const msgs = parseWhatsAppExport(`12/08/2026, 9:15 pm - Prabhu: ${text}`);
      const stats = countChants(msgs, everyOccurrence);
      expect(stats[0]?.totalCount).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// Non-Latin scripts
// ---------------------------------------------------------------------------
describe('countChants — Non-Latin scripts', () => {
  it('counts Devanagari हरे कृष्ण', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: हरे कृष्ण हरे कृष्ण');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(2);
  });

  it('counts Telugu హరే కృష్ణ', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: హరే కృష్ణ');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(1);
  });

  it('counts Tamil ஹரே கிருஷ்ணா', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: ஹரே கிருஷ்ணா');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(1);
  });

  it('counts Kannada ಹರೇ ಕೃಷ್ಣ', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: ಹರೇ ಕೃಷ್ಣ');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(1);
  });

  it('counts Bengali হরে কৃষ্ণ', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: হরে কৃষ্ণ');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(1);
  });

  it('counts Gujarati હરે કૃષ્ણ', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: હરે કૃષ્ણ');
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(1);
  });

  it('counts mixed script in single message', () => {
    const msgs = parseWhatsAppExport(
      '12/08/2026, 9:15 pm - Prabhu: Hare Krishna 🙏 हरे कृष्ण 🙏 హరే కృష్ణ'
    );
    const stats = countChants(msgs, everyOccurrence);
    expect(stats[0]?.totalCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Mahamantra counting
// ---------------------------------------------------------------------------
describe('countChants — Mahamantra', () => {
  const msgs = parseWhatsAppExport(fixture('mahamantra.txt'));

  it('counts "Hare Krishna" occurrences in full Mahamantra (every-occurrence)', () => {
    const stats = countChants(msgs, everyOccurrence);
    const d1 = stats.find((s) => s.id === 'Devotee1');
    // Line 1: Mahamantra has "Hare Krishna" twice (as pairs) → 2
    // Line 2: "Hare Krishna Hare Krishna" → 2
    // Lines 5,6,7,8: Hre Krishna, HareKrishna, Hare  Krishna, Haree Krishnaa → 1 each = 4
    // Total Devotee1: 2 + 2 + 4 = 8
    expect(d1?.totalCount).toBe(8);
  });

  it('counts Mahamantra correctly in once-per-message mode', () => {
    const stats = countChants(msgs, oncePerMessage);
    const d1 = stats.find((s) => s.id === 'Devotee1');
    // 5 messages with matches (lines 1,2,5,6,7,8 = 6 messages for Devotee1)
    expect(d1?.totalCount).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Abbreviation matching (loose mode)
// ---------------------------------------------------------------------------
describe('countChants — abbreviations', () => {
  it('does NOT match HK in strict mode', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: HK HK');
    const stats = countChants(msgs, everyOccurrence); // strict
    expect(stats.length).toBe(0);
  });

  it('matches HK in loose mode', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: HK HK');
    const stats = countChants(msgs, looseEvery);
    expect(stats[0]?.totalCount).toBe(2);
  });

  it('matches HKHK in loose mode', () => {
    const msgs = parseWhatsAppExport('12/08/2026, 9:15 pm - Prabhu: HKHK');
    const stats = countChants(msgs, looseEvery);
    expect(stats[0]?.totalCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Counting mode toggle consistency
// ---------------------------------------------------------------------------
describe('countChants — mode toggle consistency', () => {
  it('once-per-message ≤ every-occurrence for the same data', () => {
    const msgs = parseWhatsAppExport(fixture('mahamantra.txt'));
    const allStats = countChants(msgs, everyOccurrence);
    const onceStats = countChants(msgs, oncePerMessage);

    for (const once of onceStats) {
      const all = allStats.find((s) => s.id === once.id);
      expect(all!.totalCount).toBeGreaterThanOrEqual(once.totalCount);
    }
  });

  it('once-per-message total equals messageCount sum', () => {
    const msgs = parseWhatsAppExport(fixture('android.txt'));
    const stats = countChants(msgs, oncePerMessage);
    for (const s of stats) {
      expect(s.totalCount).toBe(s.messageCount);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-sender grouping
// ---------------------------------------------------------------------------
describe('countChants — sender grouping', () => {
  it('groups by sender name correctly', () => {
    const msgs = parseWhatsAppExport(fixture('multi_script.txt'));
    const stats = countChants(msgs, everyOccurrence);
    const ids = stats.map((s) => s.id);
    expect(ids).toContain('Devotee1');
    expect(ids).toContain('Devotee2');
    expect(ids).not.toContain(null);
  });

  it('includes matchedLines for drill-down', () => {
    const msgs = parseWhatsAppExport(fixture('android.txt'));
    const stats = countChants(msgs, everyOccurrence);
    for (const s of stats) {
      expect(s.matchedLines.length).toBeGreaterThan(0);
      expect(s.matchedLines.every((l) => l.count > 0)).toBe(true);
    }
  });
});
