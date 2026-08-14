/**
 * parser.ts
 *
 * Parses WhatsApp chat export text into an array of Message objects.
 * Ported and optimized from the verified Python reference implementation.
 *
 * Public API:
 *   parseWhatsAppExport(text: string): Message[]
 */

export interface Message {
  /** Raw sender string from export. null for system messages. */
  sender: string | null;
  /** Message text, fully assembled (multi-line joined). null for skipped messages. */
  content: string | null;
  /** True when this is a WhatsApp system message (no sender, not chanted). */
  isSystem: boolean;
}

// ---------------------------------------------------------------------------
// Zero-width / direction marks to strip before processing
// \u200b ZWS  \u200c ZWNJ  \u200d ZWJ  \u200e LRM  \u200f RLM
// \u202a–\u202e embedding / override chars  \uFEFF BOM
// ---------------------------------------------------------------------------
const ZW_STRIP_RE = /[\u200b-\u200f\u202a-\u202e\u202f\uFEFF]/g;

// ---------------------------------------------------------------------------
// Content patterns that indicate a message should be excluded from counting
// ---------------------------------------------------------------------------
const SKIP_CONTENT_PATTERNS: RegExp[] = [
  /^<media omitted>$/i,
  /^image omitted$/i,
  /^video omitted$/i,
  /^audio omitted$/i,
  /^sticker omitted$/i,
  /^gif omitted$/i,
  /^document omitted$/i,
  /^contact card omitted$/i,
  /^this message was deleted$/i,
  /^you deleted this message$/i,
  /\u200e?Messages and calls are end-to-end encrypted/i,
  // Missed voice/video calls
  /^missed voice call$/i,
  /^missed video call$/i,
];

// Broadened system message patterns from real export verification
const SYSTEM_MESSAGE_PATTERNS_RE = new RegExp(
  '(joined using a group link|changed the group|added |removed |left$|' +
  'changed their phone number|security code changed|created (this )?group|' +
  'changed this group|now an admin|changed to|was added|' +
  'end-to-end encrypted|missed (voice|video) call|' +
  'blocked|deleted their account|your security code|business account)',
  'i'
);

function shouldSkipContent(text: string): boolean {
  return SKIP_CONTENT_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(text.trim());
  });
}

function stripDirectionalMarks(s: string): string {
  return s.replace(ZW_STRIP_RE, '').trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function parseWhatsAppExport(rawText: string): Message[] {
  // 1. Strip zero-width, direction marks, and BOM globally to prevent prefix match failures
  const cleanText = rawText.replace(ZW_STRIP_RE, '');

  // 2. Normalize line endings
  const text = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  const messages: Message[] = [];
  let current: { sender: string; content: string } | null = null;
  let unattributedCount = 0;

  // Regexes for Android and iOS prefix formats (supports diverse locales, YYYY-MM-DD, dots, dashes, slashes, and custom AM/PM indicators)
  const IOS_PREFIX_RE = /^\[([^\]\n]{5,50})\]\s+(.*)$/;
  // Greedy match for the timestamp portion — TIMESTAMP_INDICATOR below filters false positives.
  // We deliberately do NOT use [^-] because dashes appear in dates like 12-08-2026.
  const ANDROID_PREFIX_RE = /^(\S.{4,49})\s+-\s+(.*)$/;
  
  // A valid timestamp must contain either a time-like pattern (digits separated by colon) or a date-like pattern (digits separated by slashes/dashes/dots)
  const TIMESTAMP_INDICATOR = /(?:\d{1,2}:\d{2})|(?:\d{1,4}[\/.\-]\d{1,4})/;

  // Bug 2 Fallback: matches bracketless Name: message lines
  const ORPHAN_SENDER_LINE_RE = /^([^:]{1,40}):\s([\s\S]+)$/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\u200e\u200f]/g, '');
    
    // Check if line starts with iOS or Android timestamp prefix and has a valid date/time indicator inside it
    const m = IOS_PREFIX_RE.exec(line) || ANDROID_PREFIX_RE.exec(line);
    const isValidMatch = m && TIMESTAMP_INDICATOR.test(m[1]);

    if (isValidMatch) {
      if (current) {
        messages.push(createMessage(current.sender, current.content));
      }
      const rest = m[2];
      let sender = '';
      let msg = '';
      
      // Bug 1 fix: partition by ": " to split sender from message. Handles media-only lines with no colon.
      if (rest.includes(': ')) {
        const colonIdx = rest.indexOf(': ');
        sender = rest.substring(0, colonIdx);
        msg = rest.substring(colonIdx + 2);
      } else {
        sender = rest;
        msg = '';
      }
      
      current = {
        sender: stripDirectionalMarks(sender),
        content: msg,
      };
    } else {
      // Check if this is an orphan sender line (Bug 2 fix)
      const orphan = ORPHAN_SENDER_LINE_RE.exec(line);
      if (orphan && current !== null && current.content.trim() === '') {
        const sender = orphan[1];
        const msg = orphan[2];
        messages.push(createMessage(current.sender, current.content));
        unattributedCount++;
        current = {
          sender: stripDirectionalMarks(sender),
          content: msg,
        };
      } else {
        if (current) {
          current.content += (current.content ? '\n' : '') + rawLine;
        }
      }
    }
  }

  if (current) {
    messages.push(createMessage(current.sender, current.content));
  }

  // Store the count of recovered bracketless messages in localStorage for UI access
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('gita4youth_unattributed_messages_count', String(unattributedCount));
  }

  return messages;

  function createMessage(sender: string, content: string): Message {
    const skipContent = shouldSkipContent(content);
    const isSystem = SYSTEM_MESSAGE_PATTERNS_RE.test(sender) || SYSTEM_MESSAGE_PATTERNS_RE.test(content);
    
    return {
      sender: isSystem ? null : sender,
      content: (skipContent || isSystem) ? null : content,
      isSystem,
    };
  }
}
