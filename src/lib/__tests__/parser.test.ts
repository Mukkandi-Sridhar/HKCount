import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseWhatsAppExport } from '../parser';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf-8');

// ---------------------------------------------------------------------------
// Android format
// ---------------------------------------------------------------------------
describe('parseWhatsAppExport — Android format', () => {
  const messages = parseWhatsAppExport(fixture('android.txt'));

  it('parses sender names correctly', () => {
    const senders = messages.filter((m) => !m.isSystem && m.sender).map((m) => m.sender);
    expect(senders).toContain('Jane Doe');
    expect(senders).toContain('John Smith');
    expect(senders).toContain('+91 98765 43210');
  });

  it('excludes system (end-to-end encrypted) messages from sender list', () => {
    const systemMsgs = messages.filter((m) => m.isSystem);
    expect(systemMsgs.length).toBeGreaterThan(0);
    systemMsgs.forEach((m) => expect(m.sender).toBeNull());
  });

  it('marks media omitted messages as null content', () => {
    const mediaMsgs = messages.filter(
      (m) => m.sender === 'John Smith' && m.content === null
    );
    expect(mediaMsgs.length).toBeGreaterThan(0);
  });

  it('marks deleted messages as null content', () => {
    const deleted = messages.filter(
      (m) => m.sender === 'Jane Doe' && m.content === null
    );
    expect(deleted.length).toBeGreaterThan(0);
  });

  it('joins multi-line messages into a single content string', () => {
    const multiLine = messages.find(
      (m) => m.sender === 'Jane Doe' && m.content?.includes('continuation line')
    );
    expect(multiLine).toBeDefined();
    expect(multiLine!.content).toContain('Hare Krishna');
    expect(multiLine!.content).toContain('continuation line');
    expect(multiLine!.content).toContain('another continuation line');
  });

  it('parses phone-number senders correctly', () => {
    const phoneMsg = messages.find((m) => m.sender === '+91 98765 43210');
    expect(phoneMsg).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// iOS format
// ---------------------------------------------------------------------------
describe('parseWhatsAppExport — iOS format', () => {
  const messages = parseWhatsAppExport(fixture('ios.txt'));

  it('parses iOS timestamp format correctly', () => {
    const senders = messages.filter((m) => m.sender).map((m) => m.sender);
    expect(senders).toContain('Jane Doe');
    expect(senders).toContain('John Smith');
  });

  it('treats "image omitted" as null content', () => {
    const omitted = messages.filter((m) => m.content === null && m.sender === 'Jane Doe');
    expect(omitted.length).toBeGreaterThan(0);
  });

  it('treats "You deleted this message" as null content', () => {
    const deleted = messages.filter((m) => m.content === null && m.sender === 'John Smith');
    expect(deleted.length).toBeGreaterThan(0);
  });

  it('treats system messages (e.g. "Jane Doe added John Smith") correctly', () => {
    const sysMessages = messages.filter((m) => m.isSystem);
    expect(sysMessages.length).toBeGreaterThan(0);
  });

  it('joins multi-line iOS messages', () => {
    const multi = messages.find(
      (m) => m.sender === 'Jane Doe' && m.content?.includes('Still talking')
    );
    expect(multi).toBeDefined();
    expect(multi!.content).toContain('Multi line message starts here');
    expect(multi!.content).toContain('Still talking about Hare Krishna here');
  });
});

// ---------------------------------------------------------------------------
// Zero-width / LRM character stripping
// ---------------------------------------------------------------------------
describe('parseWhatsAppExport — zero-width characters', () => {
  it('strips LRM characters and parses correctly', () => {
    // Embed LRM (\u200e) characters around the timestamp as WhatsApp does
    const withLRM =
      '\u200e12/08/2026, 9:15 pm - \u200eJane Doe: Hare Krishna\u200e';
    const messages = parseWhatsAppExport(withLRM);
    expect(messages.length).toBe(1);
    expect(messages[0].sender).toBe('Jane Doe');
    expect(messages[0].content).toContain('Hare Krishna');
  });
});
