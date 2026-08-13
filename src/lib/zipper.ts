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
 * detects the type via magic bytes and returns the parsed chat text.
 */
export async function extractChatText(file: File): Promise<string> {
  let isZip = false;
  try {
    const slice = file.slice(0, 4);
    const buffer = await slice.arrayBuffer();
    const arr = new Uint8Array(buffer);
    // ZIP archives start with the magic bytes 'PK' (0x50, 0x4B)
    isZip = arr[0] === 0x50 && arr[1] === 0x4B;
  } catch (err) {
    console.error('Failed to read file magic bytes, falling back to name/type checks:', err);
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    isZip = name.endsWith('.zip') || type === 'application/zip' || type === 'application/x-zip-compressed';
  }

  if (isZip) {
    const zip = await JSZip.loadAsync(file);

    // Prefer _chat.txt (WhatsApp's default name)
    const chatEntry =
      zip.file('_chat.txt') ??
      // Fall back to any .txt in the archive
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
    // Default fallback: read as plain text
    return file.text();
  }
}
