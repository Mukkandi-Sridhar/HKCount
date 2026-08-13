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

    return chatEntry.async('string');
  } else {
    // Treat as plain text, decode as UTF-8
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
  }
}
