export function normalizeQrText(value) {
  return String(value ?? '').trim();
}

export function classifyQrText(value) {
  const text = normalizeQrText(value);
  if (!text) return { kind: 'empty', text: '' };

  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { kind: 'url', text, href: url.href };
    }
  } catch {
    // Non-URL QR payloads remain copyable text.
  }

  return { kind: 'text', text };
}
