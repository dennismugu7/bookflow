import { describe, expect, it } from 'vitest';

import { detectImageFormat } from '../modules/media/media.schema.ts';
import { isSafeHttpUrl } from './url.ts';

/**
 * Two boundary checks that used to trust the caller.
 *
 * ══ BOTH WERE "SAFE BECAUSE SOMETHING ELSE HANDLES IT" ══════════════════════
 *
 * The stored URL was `z.url()`, which validates syntax and not scheme —
 * `javascript:` passed, and was harmless only because React refuses such an
 * href. The stored image type came from `part.mimetype`, a header the caller
 * writes, and was harmless only because nothing had tried yet.
 *
 * `jwt.ts` refuses that reasoning explicitly for tokens. These are unit tests
 * because both are pure functions and the interesting cases are inputs nobody
 * would send by accident — which is exactly what makes them worth enumerating.
 */

describe('a stored URL must be http or https', () => {
  it('accepts the ordinary cases', () => {
    expect(isSafeHttpUrl('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isSafeHttpUrl('http://example.invalid/a.jpg')).toBe(true);
    // A port, a query and a fragment are all ordinary parts of a maps link.
    expect(isSafeHttpUrl('https://example.invalid:8443/x?y=1#z')).toBe(true);
  });

  it('refuses every scheme that executes', () => {
    // The one the review found. Rendered as `<a href>` on the salon's public
    // location section.
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    // Case and whitespace variants, which is where a denylist loses and a
    // parser does not: `URL` normalises the scheme before it is compared.
    expect(isSafeHttpUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('  javascript:alert(1)  '.trim())).toBe(false);
    expect(isSafeHttpUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
    // Not executable, and still not something to store as somebody's link:
    // it would make the server fetch a local file if anything followed it.
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('refuses anything that is not an absolute URL', () => {
    // A relative value would resolve against whatever origin rendered it,
    // which for a link to somebody else's map is never what was meant.
    expect(isSafeHttpUrl('/maps/here')).toBe(false);
    expect(isSafeHttpUrl('example.invalid')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
  });
});

describe('a stored image is identified by its bytes', () => {
  /** The 8-byte PNG signature, then filler. */
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]);

  /** SOI plus the start of the next marker, then filler. */
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

  it('recognises the two formats the design uses', () => {
    expect(detectImageFormat(png)).toBe('png');
    expect(detectImageFormat(jpeg)).toBe('jpg');
  });

  it('refuses a file that merely CLAIMS to be an image', () => {
    // ── THE WHOLE POINT OF THE CHANGE ──────────────────────────────────────
    //
    // This is what a caller sending `content-type: image/png` with an HTML
    // document looks like once the header is no longer consulted. Before, it
    // was stored as `.png` in the public bucket, served with a type we chose on
    // the caller's say-so.
    const html = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
    expect(detectImageFormat(html)).toBeUndefined();

    // An SVG is an image and is also a script container. Not in
    // `ACCEPTED_IMAGE_TYPES` and not detected here — refused twice over.
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
      'utf8',
    );
    expect(detectImageFormat(svg)).toBeUndefined();

    // A GIF is a real image and still not one of the two.
    expect(detectImageFormat(Buffer.from('GIF89a', 'ascii'))).toBeUndefined();
  });

  it('refuses a near-miss rather than guessing', () => {
    // Two of JPEG's three bytes. A two-byte check would accept this, which is
    // why the third is there.
    expect(detectImageFormat(Buffer.from([0xff, 0xd8, 0x00]))).toBeUndefined();

    // Seven of PNG's eight. The `\r\n` and `\x1a` in the signature exist to
    // catch line-ending mangling, so all eight are checked.
    expect(
      detectImageFormat(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x00]),
      ),
    ).toBeUndefined();

    // Too short to be either. Must not read past the end.
    expect(detectImageFormat(Buffer.from([0x89]))).toBeUndefined();
    expect(detectImageFormat(Buffer.alloc(0))).toBeUndefined();
  });
});
