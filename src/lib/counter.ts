/**
 * counter.ts
 *
 * Counts Hare Krishna chants per sender from parsed messages.
 *
 * Public API:
 *   countChants(messages: Message[], options: CountOptions): SenderStats[]
 *
 * Two-phase matching:
 *  Phase 1 — Regex pass (fast): LATIN_REGEX + SCRIPT_PATTERNS + MAHAMANTRA_REGEX
 *  Phase 2 — Fuzzy Levenshtein fallback for any message that didn't match in phase 1
 *             (catches genuine typos without over-matching unrelated words)
 */

import type { Message } from './parser';
import {
  LATIN_REGEX,
  MAHAMANTRA_REGEX,
  SCRIPT_PATTERNS,
  CANONICAL_SPELLINGS,
  ABBREVIATION_PATTERNS,
  LEVENSHTEIN_THRESHOLDS,
} from './matcher-config';
import { distance } from 'fastest-levenshtein';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CountMode = 'every-occurrence' | 'once-per-message';

export interface CountOptions {
  /**
   * 'every-occurrence' (Option A, default): count each non-overlapping
   *   "Hare Krishna" unit in the message.
   * 'once-per-message' (Option B): 1 if the message contains any match, else 0.
   */
  mode: CountMode;
  /** Enable abbreviation patterns (HK, HKHK). Default: false. */
  looseMatching: boolean;
}

export interface MatchedLine {
  text: string;
  count: number;
  /** Indices of match spans within 'text' for highlighting. */
  spans: Array<[number, number]>;
}

export interface SenderStats {
  /** Primary grouping key — name if available, phone if not. */
  id: string;
  /** Human-readable display name. */
  displayName: string;
  /** Phone number portion, if identifiable separately. */
  phoneNumber?: string;
  /** Total chant count across all messages. */
  totalCount: number;
  /** Number of distinct messages that contained at least one match. */
  messageCount: number;
  /** Matched lines for drill-down view. */
  matchedLines: MatchedLine[];
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a message for matching:
 *  - Unicode NFKC decomposition
 *  - Strip zero-width / control chars
 *  - Collapse repeated whitespace to single space
 *  - Do NOT lowercase here — we preserve case for non-Latin script matching.
 *    Lowercase is applied inside regex via the /i flag.
 */
function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Phase 1 — Regex matching
// Returns { count, spans } for a normalised message string.
// ---------------------------------------------------------------------------

interface RegexResult {
  count: number;
  spans: Array<[number, number]>;
}

function regexMatch(text: string, opts: CountOptions): RegexResult {
  const spans: Array<[number, number]> = [];

  // Helper: run a regex, collect spans
  const run = (re: RegExp): number => {
    let localCount = 0;
    let m: RegExpExecArray | null;
    const fresh = new RegExp(re.source, re.flags); // reset lastIndex
    while ((m = fresh.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length]);
      localCount++;
    }
    return localCount;
  };

  // Full Mahamantra first (so we can decide whether to count it as N or 1)
  // We count each "Hare Krishna" occurrence within the mantra via LATIN_REGEX
  // so the Mahamantra check doesn't need special-case handling — it's just
  // counted as N occurrences of the sub-phrase.

  let count = 0;

  // Latin / English
  count += run(LATIN_REGEX);

  // Non-Latin scripts
  for (const { regex } of SCRIPT_PATTERNS) {
    count += run(regex);
  }

  // Abbreviations (loose mode only)
  if (opts.looseMatching) {
    for (const re of ABBREVIATION_PATTERNS) {
      count += run(re);
    }
  }

  return { count, spans };
}

// ---------------------------------------------------------------------------
// Phase 2 — Fuzzy Levenshtein fallback
// Only called when phase 1 found nothing.
// Tokenises the text into 1-3 word n-grams and checks against canonical forms.
// ---------------------------------------------------------------------------

function getThreshold(wordLen: number): number {
  for (const t of LEVENSHTEIN_THRESHOLDS) {
    if (wordLen >= t.minLen && wordLen <= t.maxLen) return t.maxDist;
  }
  return 0; // very short words → exact match only
}

function fuzzyMatch(text: string): boolean {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    for (const canonical of CANONICAL_SPELLINGS) {
      const threshold = Math.max(
        getThreshold(words[i].length),
        getThreshold(words[i + 1].length)
      );
      if (distance(bigram, canonical) <= threshold) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sender identity helpers
// ---------------------------------------------------------------------------

/** Detect if a string looks like a phone number (starts with + or is all digits/spaces) */
function looksLikePhone(s: string): boolean {
  return /^\+?[\d\s\-().]{7,}$/.test(s.trim());
}

function makeSenderStats(sender: string): SenderStats {
  const isPhone = looksLikePhone(sender);
  // Strip leading ~ prepended by WhatsApp for unsaved contacts
  const displayName = sender.startsWith('~') ? sender.substring(1).trim() : sender;
  return {
    id: sender,
    displayName: displayName,
    phoneNumber: isPhone ? sender : undefined,
    totalCount: 0,
    messageCount: 0,
    matchedLines: [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function countChants(messages: Message[], options: CountOptions): SenderStats[] {
  const statsMap = new Map<string, SenderStats>();

  for (const msg of messages) {
    // Skip system messages and null-content messages
    if (msg.sender === null || msg.content === null || msg.isSystem) continue;

    const norm = normalise(msg.content);

    // Phase 1
    let { count, spans } = regexMatch(norm, options);

    // Phase 2 — only if phase 1 found nothing
    if (count === 0 && fuzzyMatch(norm)) {
      count = 1; // fuzzy: at least one occurrence (we can't pinpoint spans easily)
      spans = [];
    }

    if (count === 0) continue;

    // Apply counting mode
    const effectiveCount = options.mode === 'once-per-message' ? 1 : count;

    // Look up or create sender stats
    let stats = statsMap.get(msg.sender);
    if (!stats) {
      stats = makeSenderStats(msg.sender);
      statsMap.set(msg.sender, stats);
    }

    stats.totalCount += effectiveCount;
    stats.messageCount += 1;
    stats.matchedLines.push({
      text: msg.content,
      count: effectiveCount,
      spans,
    });
  }

  // Sort by totalCount descending
  return Array.from(statsMap.values()).sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Merge multiple SenderStats entries into one (for the manual merge UI).
 * The caller picks which displayName/id to keep.
 */
export function mergeStats(entries: SenderStats[], keepId: string): SenderStats {
  const base: SenderStats = {
    id: keepId,
    displayName: entries.find((e) => e.id === keepId)?.displayName ?? keepId,
    phoneNumber: entries.find((e) => e.phoneNumber)?.phoneNumber,
    totalCount: 0,
    messageCount: 0,
    matchedLines: [],
  };

  for (const entry of entries) {
    base.totalCount += entry.totalCount;
    base.messageCount += entry.messageCount;
    base.matchedLines.push(...entry.matchedLines);
  }

  // Keep matched lines sorted by their order in the chat (approximate via index)
  return base;
}
