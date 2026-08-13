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
 * Given a File that is either:
 *  - a plain .txt file  → reads and returns the text directly
 *  - a .zip file        → extracts _chat.txt (or the first .txt found) and returns its text
 *
 * Throws if no .txt file is found inside the zip.
 */
export async function extractChatText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  const isText = name.endsWith('.txt') || type === 'text/plain';
  const isZip = name.endsWith('.zip') || type === 'application/zip' || type === 'application/x-zip-compressed';

  if (isText) {
    return file.text();
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
  }

  throw new Error(
    `Unsupported file type: "${file.name}" (${file.type || 'unknown type'}). Please upload a .txt or .zip file exported from WhatsApp.`
  );
}
