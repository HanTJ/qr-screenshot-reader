import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { PNG } from 'pngjs';

function loadJsQr() {
  const source = fs.readFileSync(new URL('../vendor/jsQR.js', import.meta.url), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.module.exports;
}

test('decodes a URL QR from a phone-shaped screenshot', () => {
  const png = PNG.sync.read(fs.readFileSync(new URL('./fixtures/qr-url-screenshot.png', import.meta.url)));
  const jsQR = loadJsQr();
  const decoded = jsQR(png.data, png.width, png.height, { inversionAttempts: 'attemptBoth' });

  assert.ok(decoded);
  assert.equal(decoded.data, 'https://example.com/qr-test?from=screenshot');
  assert.ok(decoded.location.topLeftCorner.x < decoded.location.bottomRightCorner.x);
});
