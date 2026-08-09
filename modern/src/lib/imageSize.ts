import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type ImageSize = { width: number; height: number };

// During `astro build` this module is bundled into a temporary SSR chunk, so
// `import.meta.url` no longer sits next to the source tree. The working
// directory is the reliable root there, and the source-relative path covers
// dev and any run started from outside the project.
const publicDirs = [
  join(process.cwd(), "public"),
  fileURLToPath(new URL("../../public/", import.meta.url))
];
const cache = new Map<string, ImageSize | null>();

function readGif(buf: Buffer): ImageSize {
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readPng(buf: Buffer): ImageSize {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageSize | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

function readWebp(buf: Buffer): ImageSize | null {
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function readSvg(buf: Buffer): ImageSize | null {
  const head = buf.toString("utf8", 0, Math.min(buf.length, 4096));
  const attr = (name: string) => {
    const match = head.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9.]+)\\s*(?:px)?\\s*["']`, "i"));
    return match ? Number.parseFloat(match[1]) : null;
  };
  const width = attr("width");
  const height = attr("height");
  if (width && height) {
    return { width, height };
  }
  const viewBox = head.match(/\bviewBox\s*=\s*["']\s*([-0-9.]+)[\s,]+([-0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i);
  if (viewBox) {
    return { width: Number.parseFloat(viewBox[3]), height: Number.parseFloat(viewBox[4]) };
  }
  return null;
}

function parse(buf: Buffer): ImageSize | null {
  if (buf.length < 24) {
    return null;
  }
  if (buf.toString("ascii", 0, 3) === "GIF") {
    return readGif(buf);
  }
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return readPng(buf);
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return readJpeg(buf);
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return readWebp(buf);
  }
  if (buf.toString("ascii", 0, 5) === "<?xml" || buf.includes("<svg")) {
    return readSvg(buf);
  }
  return null;
}

/**
 * Intrinsic pixel size of an asset served from `public/`, read at build time.
 * Returns null when the file is missing or the format is not recognised.
 */
export function getImageSize(src: string): ImageSize | null {
  if (cache.has(src)) {
    return cache.get(src) ?? null;
  }
  const relative = src.replace(/^\/+/, "");
  let size: ImageSize | null = null;
  for (const dir of publicDirs) {
    try {
      size = parse(readFileSync(join(dir, relative)));
      break;
    } catch {
      // Try the next candidate root.
    }
  }
  if (size && !(size.width > 0 && size.height > 0)) {
    size = null;
  }
  cache.set(src, size);
  return size;
}
