import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const outputDir = fileURLToPath(new URL("../icons/", import.meta.url));
mkdirSync(outputDir, { recursive: true });

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeIcon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const start = [1, 118, 211];
  const end = [15, 159, 143];
  const radius = Math.round(size * 0.18);
  const center = size / 2;

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      const dx = Math.max(radius - x, 0, x - (size - radius - 1));
      const dy = Math.max(radius - y, 0, y - (size - radius - 1));
      const alpha = dx * dx + dy * dy <= radius * radius ? 255 : 0;
      const t = (x + y) / (size * 2);
      const highlight = Math.max(0, 1 - Math.hypot(x - center, y - center) / center) * 28;
      raw[offset] = Math.min(255, Math.round(start[0] * (1 - t) + end[0] * t + highlight));
      raw[offset + 1] = Math.min(255, Math.round(start[1] * (1 - t) + end[1] * t + highlight));
      raw[offset + 2] = Math.min(255, Math.round(start[2] * (1 - t) + end[2] * t + highlight));
      raw[offset + 3] = alpha;
    }
  }

  drawText(raw, size, "SF");

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const glyphs = {
  S: ["11110", "10000", "10000", "11110", "00010", "00010", "11110"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"]
};

function drawText(raw, size, text) {
  const scale = Math.max(8, Math.floor(size / 36));
  const glyphWidth = 5;
  const glyphHeight = 7;
  const gap = scale * 2;
  const totalWidth = text.length * glyphWidth * scale + (text.length - 1) * gap;
  const startX = Math.round((size - totalWidth) / 2);
  const startY = Math.round((size - glyphHeight * scale) / 2);

  Array.from(text).forEach((char, charIndex) => {
    const glyph = glyphs[char];
    const charX = startX + charIndex * (glyphWidth * scale + gap);
    glyph.forEach((row, y) => {
      Array.from(row).forEach((pixel, x) => {
        if (pixel !== "1") return;
        for (let yy = 0; yy < scale; yy += 1) {
          for (let xx = 0; xx < scale; xx += 1) {
            const px = charX + x * scale + xx;
            const py = startY + y * scale + yy;
            const offset = py * (size * 4 + 1) + 1 + px * 4;
            raw[offset] = 255;
            raw[offset + 1] = 255;
            raw[offset + 2] = 255;
            raw[offset + 3] = 255;
          }
        }
      });
    });
  });
}

for (const size of [192, 512]) {
  writeFileSync(join(outputDir, `icon-${size}.png`), makeIcon(size));
}
