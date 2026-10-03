import "server-only";
import { readdir, open } from "node:fs/promises";
import path from "node:path";

export type HeroSlide = { src: string; width: number; height: number };

// Discover supplied assets on the server; no generated manifest or missing-file references.
export async function heroSliderAssets(): Promise<HeroSlide[]> {
  const directory = path.join(process.cwd(), "public");
  const files = (await readdir(directory)).filter(name => /^heroSlider.*\.png$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const slides = await Promise.all(files.map(async name => {
    const file = await open(path.join(directory, name), "r");
    // Some supplied .png filenames contain JPEG data. Inspect the header without
    // renaming/re-encoding user assets or reading multi-megabyte image bodies.
    const bytes = Buffer.alloc(65536);
    let length: number;
    try { length = (await file.read(bytes, 0, bytes.length, 0)).bytesRead; } finally { await file.close(); }
    let width = 0, height = 0;
    if (length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
    } else if (bytes[0] === 255 && bytes[1] === 216) {
      let offset = 2;
      while (offset + 8 < length && bytes[offset] === 255) {
        const marker = bytes[offset + 1];
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
          height = bytes.readUInt16BE(offset + 5); width = bytes.readUInt16BE(offset + 7); break;
        }
        const size = bytes.readUInt16BE(offset + 2);
        if (size < 2) break;
        offset += size + 2;
      }
    }
    return width && height ? { src: `/${name}`, width, height } : null;
  }));
  return slides.filter((slide): slide is HeroSlide => slide !== null);
}
