/**
 * zipper.ts
 *
 * Extracts _chat.txt from a WhatsApp .zip export entirely in the browser.
 * Media files inside the zip are ignored.
 *
 * Public API:
 *   extractChatText(file: File): Promise<string>
 */

import JSZip from 'jszip';

/**
 * Robustly decodes a text buffer by checking for UTF-16 BOM signatures
 * or analyzing byte structure, falling back to UTF-8.
 * WhatsApp exports can be UTF-8 (typical Android) or UTF-16LE (typical iOS).
 */
function decodeTextBuffer(buffer: ArrayBuffer | ArrayBufferLike): string {
  const arr = new Uint8Array(buffer);

  // 1. Check for UTF-16 LE BOM (FF FE)
  if (arr.length >= 2 && arr[0] === 0xFF && arr[1] === 0xFE) {
    const decoder = new TextDecoder('utf-16le');
    return decoder.decode(buffer);
  }

  // 2. Check for UTF-16 BE BOM (FE FF)
  if (arr.length >= 2 && arr[0] === 0xFE && arr[1] === 0xFF) {
    const decoder = new TextDecoder('utf-16be');
    return decoder.decode(buffer);
  }

  // 3. Detect UTF-16LE without BOM by checking density of null bytes in high positions
  let nullsCount = 0;
  const limit = Math.min(arr.length, 100);
  for (let i = 1; i < limit; i += 2) {
    if (arr[i] === 0) nullsCount++;
  }
  if (limit > 10 && nullsCount / (limit / 2) > 0.8) {
    const decoder = new TextDecoder('utf-16le');
    return decoder.decode(buffer);
  }

  // 4. Default: decode as UTF-8
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Given a File that is either a plain text chat file or a zipped archive,
 * reads the entire file as an ArrayBuffer (to ensure iCloud cloud files are fully
 * downloaded by iOS Safari) and parses the chat text.
 */
export async function extractChatText(file: File): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new Error('Failed to read file from your device. If using iCloud, make sure the file is downloaded.');
  }

  const arr = new Uint8Array(arrayBuffer);
  // Detect if it is a ZIP file by checking the first two magic bytes ('P' and 'K')
  const isZip = arr[0] === 0x50 && arr[1] === 0x4B;

  if (isZip) {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Prefer _chat.txt (WhatsApp's default name)
    const chatEntry =
      zip.file('_chat.txt') ??
      // Fall back to any .txt in the archive (e.g. "WhatsApp Chat - Group Name.txt" on iOS)
      Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith('.txt')
      );

    if (!chatEntry) {
      throw new Error(
        'No .txt file found inside the zip. Make sure you exported the WhatsApp chat as text.'
      );
    }

    // Extract as Uint8Array to handle potential UTF-16LE encoding inside the zip
    const chatBytes = await chatEntry.async('uint8array');
    return decodeTextBuffer(chatBytes.buffer);
  } else {
    // Treat as plain text
    return decodeTextBuffer(arrayBuffer);
  }
}
