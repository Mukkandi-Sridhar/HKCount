/**
 * matcher-config.ts
 *
 * Single source of truth for ALL Hare Krishna recognition patterns.
 *
 * Edit THIS file (and only this file) when you discover new spelling variants
 * or new scripts in your real chat data. The counting engine imports from here.
 */

// ---------------------------------------------------------------------------
// Latin / English regex pattern
// Handles: Hare/Haree/Hre/Hari + Krishna/Krshna/Krsna/Krishnaa/Krishn/Krishnam
// Also handles: HareKrishna (no space), Hare  Krishna (double space)
// ---------------------------------------------------------------------------
export const LATIN_REGEX =
  /\b(?:h[ae]ree?|hre|hari)\s*kr[ei]?shn?(?:a+m?|am?)?\b/gi;

// ---------------------------------------------------------------------------
// Full Mahamantra regex
// Matches the full 32-word mantra typed as a single message (any line breaks
// or spacing between words). This is matched BEFORE the word-unit pass so the
// mantra text doesn't double-count its embedded "Hare Krishna" sub-phrases.
// ---------------------------------------------------------------------------
export const MAHAMANTRA_REGEX =
  /(?:h[ae]ree?\s+kr[ei]?shn?a+\s+){2}(?:kr[ei]?shn?a+\s+){2}h[ae]ree?\s+h[ae]ree?\s+h[ae]ree?\s+(?:h[ae]ree?\s+ram[ae]?\s+){2}(?:ram[ae]?\s+){2}h[ae]ree?\s+h[ae]ree?\s*/gi;

// ---------------------------------------------------------------------------
// Non-Latin script patterns
// One literal regex per script; extend this array to add new scripts.
// ---------------------------------------------------------------------------
export const SCRIPT_PATTERNS: { script: string; regex: RegExp }[] = [
  // Devanagari / Hindi
  { script: 'Devanagari', regex: /हरे\s*कृष्ण/g },
  // Telugu
  { script: 'Telugu', regex: /హరే\s*కృష్ణ/g },
  // Tamil
  { script: 'Tamil', regex: /ஹரே\s*கிருஷ்ணா?/g },
  // Kannada
  { script: 'Kannada', regex: /ಹರೇ\s*ಕೃಷ್ಣ/g },
  // Bengali
  { script: 'Bengali', regex: /হরে\s*কৃষ্ণ/g },
  // Gujarati
  { script: 'Gujarati', regex: /\u0ab9\u0ab0\u0ac7\s*\u0a95\u0ac3\u0ab7\u0acd\u0aa3/g },
  // Malayalam
  { script: 'Malayalam', regex: /ഹരേ\s*കൃഷ്ണ/g },
  // Odia
  { script: 'Odia', regex: /ହରେ\s*କୃଷ୍ଣ/g },
];

// ---------------------------------------------------------------------------
// Canonical spelling dictionary for fuzzy fallback
// Keys are canonical forms; values are the 2-word [hare-part, krishna-part]
// split used by the Levenshtein matcher. Extend as needed.
// ---------------------------------------------------------------------------
export const CANONICAL_SPELLINGS: string[] = [
  'hare krishna',
  'hare krshna',
  'hare krsna',
  'haree krishna',
  'hari krishna',
  'hare krishnaa',
  'hare krishnam',
];

// ---------------------------------------------------------------------------
// Abbreviation patterns — only active in "loose matching" mode
// ---------------------------------------------------------------------------
export const ABBREVIATION_PATTERNS: RegExp[] = [
  /\bHKHK\b/g,  // "Hare Krishna Hare Krishna" abbreviated
  /\bHK\b/g,    // "Hare Krishna" abbreviated — highest false-positive risk
];

// ---------------------------------------------------------------------------
// Levenshtein thresholds by word length
// Edit distance allowed for fuzzy matching of each token.
// ---------------------------------------------------------------------------
export const LEVENSHTEIN_THRESHOLDS: { minLen: number; maxLen: number; maxDist: number }[] = [
  { minLen: 4,  maxLen: 5,  maxDist: 1 },
  { minLen: 6,  maxLen: 9,  maxDist: 2 },
  { minLen: 10, maxLen: 99, maxDist: 3 },
];
