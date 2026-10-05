import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQrText, normalizeQrText } from '../qr-utils.js';

test('normalizes surrounding whitespace without changing payload', () => {
  assert.equal(normalizeQrText('  hello world\n'), 'hello world');
});

test('classifies http URL as a safe clickable link', () => {
  assert.deepEqual(classifyQrText('https://example.com/path?q=1'), {
    kind: 'url',
    text: 'https://example.com/path?q=1',
    href: 'https://example.com/path?q=1'
  });
});

test('classifies uppercase HTTP scheme as a clickable link', () => {
  assert.equal(classifyQrText('HTTP://example.com').kind, 'url');
});

test('does not turn javascript scheme into a link', () => {
  assert.deepEqual(classifyQrText('javascript:alert(1)'), {
    kind: 'text',
    text: 'javascript:alert(1)'
  });
});

test('keeps plain QR content as text', () => {
  assert.deepEqual(classifyQrText('WIFI:T:WPA;S:Cafe;P:secret;;'), {
    kind: 'text',
    text: 'WIFI:T:WPA;S:Cafe;P:secret;;'
  });
});

test('handles empty decoded content', () => {
  assert.deepEqual(classifyQrText('  '), { kind: 'empty', text: '' });
});
