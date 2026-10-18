import { SELF_COLORS, OTHER_COLORS, level } from "../pair/presentation.js";
// Small deterministic rasterizer: no DOM, native canvas, AI or external fonts.
const DIGITS = [
  "111101101101111",
  "010110010010111",
  "111001111100111",
  "111001111001111",
  "101101111001001",
  "111100111001111",
  "111100111101111",
  "111001001001001",
  "111101111101111",
  "111101111001111",
];
export async function renderCalendarPng(share) {
  const pad = new Date(share.days[0].date + "T00:00:00Z").getUTCDay();
  const cell = 92,
    gap = 8,
    margin = 20,
    width = 732,
    height = margin * 2 + Math.ceil((share.days.length + pad) / 7) * 100 - 8;
  const pixels = new Uint8Array((width * 3 + 1) * height);
  pixels.fill(255);
  for (let y = 0; y < height; y++) pixels[y * (width * 3 + 1)] = 0;
  function rect(x, y, w, h, hex) {
    const color = hex.match(/[0-9a-f]{2}/gi).map((s) => parseInt(s, 16));
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        const at = yy * (width * 3 + 1) + 1 + xx * 3;
        pixels.set(color, at);
      }
  }
  function label(text, x, y) {
    for (const c of text) {
      const pattern = c === "/" ? "001001010100100" : DIGITS[Number(c)];
      if (pattern)
        for (let i = 0; i < 15; i++)
          if (pattern[i] === "1")
            rect(x + (i % 3) * 3, y + Math.floor(i / 3) * 3, 3, 3, "334155");
      x += 12;
    }
  }
  const selected = new Set(share.candidates.map((c) => c.date));
  share.days.forEach((day, i) => {
    const x = margin + ((i + pad) % 7) * 100,
      y = margin + Math.floor((i + pad) / 7) * 100;
    rect(x, y, cell, cell, "d6dce5");
    rect(
      x + 1,
      y + 1,
      cell - 2,
      cell / 2 - 1,
      SELF_COLORS[level(day.self.busyRatio)].slice(1),
    );
    rect(
      x + 1,
      y + cell / 2,
      cell - 2,
      cell / 2 - 1,
      OTHER_COLORS[level(day.other.busyRatio)].slice(1),
    );
    label(String(Number(day.date.slice(8))), x + 8, y + 9);
    if (day.date === share.today || day.date.endsWith("-01"))
      label(String(Number(day.date.slice(5, 7))) + "/", x + 57, y + 9);
    if (selected.has(day.date)) {
      // Symbolic star, kept out of the text/font system.
      const star = [
        "0001000",
        "0001000",
        "1111111",
        "0111110",
        "0011100",
        "0110110",
        "0100010",
      ];
      star.forEach((row, yy) =>
        [...row].forEach((bit, xx) => {
          if (bit === "1")
            rect(x + 8 + xx * 3, y + 61 + yy * 3, 3, 3, "334155");
        }),
      );
    }
  });
  const compressed = new Uint8Array(
    await new Response(
      new Blob([pixels]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );
  const ihdr = new Uint8Array(13),
    view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array()),
  ];
  return new Uint8Array(await new Blob(parts).arrayBuffer());
}
function chunk(type, data) {
  const text = new TextEncoder().encode(type),
    out = new Uint8Array(data.length + 12),
    view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(text, 4);
  out.set(data, 8);
  let crc = 0xffffffff;
  for (const b of out.subarray(4, -4)) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(out.length - 4, (crc ^ 0xffffffff) >>> 0);
  return out;
}
