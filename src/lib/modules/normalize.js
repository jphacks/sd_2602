// M04 EventNormalizer（normalize stage）
// 純関数：DB・外部API・時計に依存しない。固定入力で単独実行できる。
// 入力のイベント形式は CalendarSource.events と同一（docs/schedule-state-and-schema.md §5）。

export function normalize(rawEvents) {
  const stats = { received: rawEvents.length, valid: 0, excluded: 0 };
  const seenProviderIds = new Set();
  const events = [];

  for (const raw of rawEvents) {
    const duplicate = raw.provider_event_id && seenProviderIds.has(raw.provider_event_id);
    if (!isValid(raw) || duplicate) {
      stats.excluded += 1;
      continue;
    }
    if (raw.provider_event_id) seenProviderIds.add(raw.provider_event_id);
    events.push(toNormalizedEvent(raw));
    stats.valid += 1;
  }

  return { events, stats };
}

function isValid(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (raw.status && raw.status !== "confirmed" && raw.status !== "tentative") return false; // cancelledのみ除外（Google: confirmed/tentative/cancelled）
  if (raw.kind === "all_day") {
    return isDateString(raw.start_date) && isDateString(raw.end_date_exclusive) && raw.start_date < raw.end_date_exclusive;
  }
  if (raw.kind === "timed") {
    const start = Date.parse(raw.starts_at);
    const end = Date.parse(raw.ends_at);
    return !Number.isNaN(start) && !Number.isNaN(end) && start < end;
  }
  return false;
}

function toNormalizedEvent(raw) {
  const base = {
    kind: raw.kind,
    providerEventId: raw.provider_event_id ?? null,
    isAllDay: raw.kind === "all_day",
    eventType: raw.event_type ?? "default",
    transparency: raw.transparency ?? "opaque",
    // 未設定の参加状態を承諾済みと推測しない（草案§5）
    participationStatus: raw.participation_status ?? "needsAction",
    status: raw.status ?? "confirmed",
  };
  if (raw.kind === "all_day") {
    return { ...base, startDate: raw.start_date, endDateExclusive: raw.end_date_exclusive };
  }
  return { ...base, startsAtMs: Date.parse(raw.starts_at), endsAtMs: Date.parse(raw.ends_at) };
}

function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}