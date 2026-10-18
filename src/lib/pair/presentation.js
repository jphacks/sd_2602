export const SELF_COLORS = ["#FFFFFF", "#E6F9F0", "#A7F3D0", "#5EEAD4"];
export const OTHER_COLORS = ["#FFFFFF", "#E8F7FE", "#C3EEFD", "#9DDFFB"];
export function level(ratio) {
  return ratio >= 0.7 ? 3 : ratio >= 0.4 ? 2 : ratio >= 0.15 ? 1 : 0;
}
export function monthBorder() {
  return "#D6DCE5";
}
export function updatedLabel(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
