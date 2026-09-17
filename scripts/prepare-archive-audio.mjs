import { readFile, writeFile } from 'node:fs/promises';

// Keep every MPEG frame unchanged; the page already supplies the title/artist.
// Removing the large ID3 artwork lets the first audio frame arrive immediately.
const input = new URL('../public/audio/mr-broken-heart-instrumental.mp3', import.meta.url);
const output = new URL('../public/audio/mr-broken-heart-instrumental-web.mp3', import.meta.url);
const source = await readFile(input);
if (source.subarray(0, 3).toString() !== 'ID3') throw new Error('Expected an ID3-tagged MP3');
const tagSize = source.subarray(6, 10).reduce((size, byte) => (size << 7) | byte, 0);
const footerSize = source[3] === 4 && (source[5] & 0x10) ? 10 : 0;
const frameOffset = 10 + tagSize + footerSize;
if (source[frameOffset] !== 0xff || (source[frameOffset + 1] & 0xe0) !== 0xe0) {
  throw new Error('Expected an MPEG frame after the ID3 tag');
}
await writeFile(output, source.subarray(frameOffset));
console.log(`Web MP3: ${source.length - frameOffset} bytes; removed ${frameOffset} metadata bytes. Audio frames unchanged.`);
