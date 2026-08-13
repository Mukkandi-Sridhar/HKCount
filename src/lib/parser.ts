/**
 * parser.ts
 *
 * Parses WhatsApp chat export text into an array of Message objects.
 *
 * Public API:
 *   parseWhatsAppExport(text: string): Message[]
 *
 * Handles:
 *  - Android format: "DD/MM/YYYY, H:MM am/pm - Sender: text"
 *  - iOS format:     "[DD/MM/YYYY, HH:MM:SS AM/PM] Sender: text"
 *  - Multi-line continuation messages
 *  - System messages (no sender) → sender: null
 *  - Media/deleted message placeholders → content set to null
 *  - Zero-width / LRM character stripping
 *  - .zip handling is done BEFORE calling this function (see zipper.ts)
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
const ZW_STRIP_RE = /[\u200b-\u200f\u202a-\u202e\uFEFF]/g;

// ---------------------------------------------------------------------------
// Message line regexes
//
// Android: DD/MM/YYYY, H:MM am/pm - Sender: message
// Supports separators  /  .  -  and date variants DD/MM/YY(YY)
// am/pm may be separated by a narrow no-break space (\u202f) or regular space.
// ---------------------------------------------------------------------------
const ANDROID_LINE_RE =
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s*[\u202f ]?[aApP]\.?[mM]\.?\s+-\s+([\s\S]+?):\s([\s\S]*)$/;

// Android 24h variant: "DD/MM/YYYY, HH:MM - Sender: message"
const ANDROID_24H_LINE_RE =
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s+-\s+([\s\S]+?):\s([\s\S]*)$/;

// Android system message (no colon-separated sender after dash)
const ANDROID_SYSTEM_RE =
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s*[\u202f ]?[aApP]\.?[mM]\.?\s+-\s+([\s\S]+)$/;
const ANDROID_SYSTEM_24H_RE =
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s+-\s+([\s\S]+)$/;

// iOS: [DD/MM/YYYY, HH:MM:SS AM/PM] Sender: message
const IOS_LINE_RE =
  /^\[(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\s*[\u202f ]?[aApP]\.?[mM]\.?\]\s+([\s\S]+?):\s([\s\S]*)$/;

// iOS 24h variant
const IOS_24H_LINE_RE =
  /^\[(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?\]\s+([\s\S]+?):\s([\s\S]*)$/;

// iOS system message (no sender)
const IOS_SYSTEM_RE =
  /^\[(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[\u202f ]?[aApP]\.?[mM]\.?)?\]\s+([\s\S]+)$/;

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

// System message content patterns (when we have a line that looks like sender+message but is actually system)
const SYSTEM_CONTENT_PATTERNS: RegExp[] = [
  /added .+/i,
  /removed .+/i,
  /left$/i,
  /changed the group name/i,
  /changed the group icon/i,
  /changed the group description/i,
  /changed their phone number/i,
  /was added$/i,
  /created group/i,
  /changed the subject/i,
  /pinned a message/i,
  /security code changed/i,
];

function shouldSkipContent(text: string): boolean {
  return SKIP_CONTENT_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(text.trim());
  });
}

// ---------------------------------------------------------------------------
// Parse a single line into { sender, content } or null if it's a continuation
// ---------------------------------------------------------------------------
interface ParsedLine {
  sender: string | null;
  content: string;
  isSystem: boolean;
}

function parseLine(line: string): ParsedLine | null {
  // Try each regex in order of specificity
  const matchers: Array<{ re: RegExp; senderGroup: number; contentGroup: number; isSystem: boolean }> = [
    { re: ANDROID_LINE_RE,      senderGroup: 2, contentGroup: 3, isSystem: false },
    { re: ANDROID_24H_LINE_RE,  senderGroup: 2, contentGroup: 3, isSystem: false },
    { re: IOS_LINE_RE,          senderGroup: 2, contentGroup: 3, isSystem: false },
    { re: IOS_24H_LINE_RE,      senderGroup: 2, contentGroup: 3, isSystem: false },
  ];

  for (const { re, senderGroup, contentGroup } of matchers) {
    const m = re.exec(line);
    if (m) {
      return { sender: m[senderGroup].trim(), content: m[contentGroup], isSystem: false };
    }
  }

  // System message matchers (no sender)
  const sysMatchers: Array<RegExp> = [
    ANDROID_SYSTEM_RE,
    ANDROID_SYSTEM_24H_RE,
    IOS_SYSTEM_RE,
  ];

  for (const re of sysMatchers) {
    const m = re.exec(line);
    if (m) {
      return { sender: null, content: m[2], isSystem: true };
    }
  }

  // Continuation line (no timestamp prefix)
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function parseWhatsAppExport(rawText: string): Message[] {
  // 1. Strip zero-width and direction marks
  const text = rawText.replace(ZW_STRIP_RE, '');

  // 2. Split into lines (handle \r\n and \r)
  const lines = text.split(/\r\n|\r|\n/);

  const messages: Message[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parsed = parseLine(line);

    if (parsed === null) {
      // Continuation of previous message
      if (messages.length > 0) {
        const prev = messages[messages.length - 1];
        if (prev.content !== null) {
          prev.content = prev.content + '\n' + line;
        }
      }
      continue;
    }

    // Skip certain system messages entirely
    if (parsed.isSystem) {
      messages.push({ sender: null, content: parsed.content, isSystem: true });
      continue;
    }

    // Check if content should be excluded (media placeholders, deleted, etc.)
    const skipContent = shouldSkipContent(parsed.content);

    messages.push({
      sender: parsed.sender,
      content: skipContent ? null : parsed.content,
      isSystem: false,
    });
  }

  return messages;
}
