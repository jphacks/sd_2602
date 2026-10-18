export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("ja-JP", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export const shortId = (value, length = 8) =>
  value ? value.slice(0, length) : "—";