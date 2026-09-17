import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('web MP3 removes the large leading tag and preserves every audio frame', async () => {
  const [original, web] = await Promise.all([
    readFile(new URL('../public/audio/mr-broken-heart-instrumental.mp3', import.meta.url)),
    readFile(new URL('../public/audio/mr-broken-heart-instrumental-web.mp3', import.meta.url)),
  ]);
  assert.equal(original.subarray(0, 3).toString(), 'ID3');
  const tagBytes = 10 + original.subarray(6, 10).reduce((size, byte) => (size << 7) | byte, 0);
  assert.ok(tagBytes > 500_000, 'Avoid fetching unused embedded metadata before the music');
  assert.equal(web[0], 0xff);
  assert.equal(web[1] & 0xe0, 0xe0);
  assert.deepEqual(web, original.subarray(tagBytes), 'The encoded music must be byte-for-byte unchanged');
});
