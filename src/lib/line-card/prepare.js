import { selectPair } from "../pair/select.js";
import { buildShare } from "../pair/share.js";
import { renderCalendarPng } from "./png.js";
import { addDays } from "../personal/dates.js";
// Called at calendar-update time. Store interface is intentionally independent of DB.
export async function prepareCard({
  self,
  other,
  today,
  window,
  version,
  generatedAt,
  selfFetchedAt,
  otherFetchedAt,
  store,
  render = renderCalendarPng,
}) {
  if (
    !version ||
    !selfFetchedAt ||
    !otherFetchedAt ||
    !self.length ||
    self.length > 31 ||
    self.length !== other.length ||
    new Set(self.map((d) => d.date)).size !== self.length ||
    self.some(
      (d, i) => d.date !== addDays(today, i) || d.date !== other[i].date,
    )
  )
    throw new Error("CARD_INPUT_INVALID");
  const dates = selectPair(self, other, { today, window });
  const share = buildShare(self, other, {
    today,
    window,
    dates,
    version,
    generatedAt,
  });
  const png = await render(share);
  const imageHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", png)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const expiresAt = addDays(self.at(-1).date, 8) + "T00:00:00+09:00";
  const asset = await store.saveImage({ version, png, imageHash });
  if (!asset?.key) throw new Error("CARD_IMAGE_SAVE_FAILED");
  // Never publish "ready" until BOTH image and result are saved. No in-memory latest pointer.
  const record = {
    version,
    state: "ready",
    share,
    selfFetchedAt,
    otherFetchedAt,
    expiresAt,
    image: {
      key: asset.key,
      hash: imageHash,
      version,
      rendererVersion: "calendar-raster-v1",
      width: new DataView(png.buffer, png.byteOffset, png.byteLength).getUint32(
        16,
      ),
      height: new DataView(
        png.buffer,
        png.byteOffset,
        png.byteLength,
      ).getUint32(20),
    },
  };
  await store.saveResult(record);
  return record;
}
