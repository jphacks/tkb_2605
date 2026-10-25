// Reproducible, dependency-free rasterization of the app's simple dumbbell mark.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}
function icon(size, badge = false) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x / size - .5, dy = y / size - .5;
    const u = (dx + dy) / Math.sqrt(2), v = (dy - dx) / Math.sqrt(2);
    const mark = (Math.abs(u) <= .28 && Math.abs(v) <= .035)
      || (Math.abs(u) >= .13 && Math.abs(u) <= .21 && Math.abs(v) <= .17)
      || (Math.abs(u) >= .22 && Math.abs(u) <= .28 && Math.abs(v) <= .12);
    const color = mark ? [255, 255, 255, 255] : badge ? [0, 0, 0, 0] : [139, 40, 23, 255];
    pixels.set(color, y * (size * 4 + 1) + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}
const destination = new URL("../public/icons/", import.meta.url);
mkdirSync(destination, { recursive: true });
for (const size of [192, 512]) writeFileSync(new URL(`push-${size}.png`, destination), icon(size));
writeFileSync(new URL("push-badge.png", destination), icon(96, true));
