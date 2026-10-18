import {
  SELF_COLORS,
  OTHER_COLORS,
  level,
  monthBorder,
} from "./presentation.js";
// Render ONLY the public share DTO. This image never contains private day details.
export async function calendarPng(share) {
  const padding = new Date(share.days[0].date + "T00:00:00Z").getUTCDay();
  const rows = Math.ceil((share.days.length + padding) / 7),
    cell = 120,
    gap = 12,
    margin = 36;
  const canvas = document.createElement("canvas");
  canvas.width = margin * 2 + 7 * cell + 6 * gap;
  canvas.height = margin * 2 + rows * (cell + gap) - gap;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("IMAGE_CANVAS_UNAVAILABLE");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const candidates = new Set(share.candidates.map((c) => c.date));
  for (const [i, day] of share.days.entries()) {
    const index = i + padding,
      x = margin + (index % 7) * (cell + gap),
      y = margin + Math.floor(index / 7) * (cell + gap);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cell, cell, 14);
    ctx.clip();
    ctx.fillStyle = SELF_COLORS[level(day.self.busyRatio)];
    ctx.fillRect(x, y, cell, cell / 2);
    ctx.fillStyle = OTHER_COLORS[level(day.other.busyRatio)];
    ctx.fillRect(x, y + cell / 2, cell, cell / 2);
    ctx.strokeStyle = "#D6DCE5";
    ctx.beginPath();
    ctx.moveTo(x, y + cell / 2);
    ctx.lineTo(x + cell, y + cell / 2);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = monthBorder(day.date);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cell, cell, 14);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(
      Number(day.date.slice(5, 7)) + "/" + Number(day.date.slice(8)),
      x + 10,
      y + 26,
    );
    if (candidates.has(day.date)) {
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("★", x + 10, y + cell - 12);
    }
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")),
      "image/png",
    ),
  );
}
