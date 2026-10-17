// M05 DayAggregator（calculate stage）
// 純関数：DB・外部API・時計に依存しない。
// 未取得日は dates に含めないことで「取得済みだが空き」と区別する。

export const DEFAULT_ACTIVITY_WINDOW = { startMinute: 540, endMinute: 1320 }; // 09:00〜22:00

export function calculateDaily(events, { dates, offsetMinutes = 540, activityWindow = DEFAULT_ACTIVITY_WINDOW }) {
  return dates.map((date) => {
    const row = availabilityOn(events, date, offsetMinutes, activityWindow.startMinute, activityWindow.endMinute);
    return { date, activeMinutes: row.activeMinutes, busyMinutes: row.busyMinutes, busyRatio: row.busyRatio };
  });
}

export function calculateHourly(events, { dates, offsetMinutes = 540, activityWindow = DEFAULT_ACTIVITY_WINDOW }) {
  const rows = [];
  for (const date of dates) {
    for (let minute = activityWindow.startMinute; minute < activityWindow.endMinute; minute += 60) {
      const slotEndMinute = Math.min(minute + 60, activityWindow.endMinute);
      const row = availabilityOn(events, date, offsetMinutes, minute, slotEndMinute);
      rows.push({
        slotStart: `${date}T${toClock(minute)}`,
        activeMinutes: row.activeMinutes,
        busyMinutes: row.busyMinutes,
        busyRatio: row.busyRatio,
      });
    }
  }
  return rows;
}

// 活動時間は1日1区間の簡易版。allDayEquivalent：終日予定は活動時間全体を多忙扱い。
function availabilityOn(events, date, offsetMinutes, fromMinute, toMinute) {
  const windowStartMs = localMs(date, fromMinute, offsetMinutes);
  const windowEndMs = localMs(date, toMinute, offsetMinutes);
  const activeMinutes = toMinute - fromMinute;
  const busyMinutes = sumBusyMinutes(events, date, windowStartMs, windowEndMs);
  return {
    activeMinutes,
    busyMinutes,
    busyRatio: activeMinutes > 0 ? round4(busyMinutes / activeMinutes) : 0,
  };
}

function sumBusyMinutes(events, date, windowStartMs, windowEndMs) {
  const intervals = [];
  for (const event of events) {
    if (!isBusy(event)) continue;
    if (event.isAllDay) {
      if (event.startDate <= date && date < event.endDateExclusive) {
        intervals.push([windowStartMs, windowEndMs]);
      }
      continue;
    }
    const start = Math.max(event.startsAtMs, windowStartMs);
    const end = Math.min(event.endsAtMs, windowEndMs);
    if (start < end) intervals.push([start, end]);
  }
  return mergeAndSumMinutes(intervals);
}

// 集計判断（Google互換・草案§5）：cancelled以外 × 不透明 × 承諾済み × 勤務地以外を多忙とする
function isBusy(event) {
  const active = event.status === "confirmed" || event.status === "tentative";
  return active
    && event.transparency !== "transparent"
    && event.participationStatus === "accepted"
    && event.eventType !== "workingLocation";
}

function mergeAndSumMinutes(intervals) {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let totalMs = 0;
  let currentStart = sorted[0][0];
  let currentEnd = sorted[0][1];
  for (let i = 1; i < sorted.length; i += 1) {
    const [start, end] = sorted[i];
    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
    } else {
      totalMs += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }
  totalMs += currentEnd - currentStart;
  return totalMs / 60000;
}

// 地域の固定オフセット分でdate+分→UTCミリ秒へ（純計算・タイマー不使用）
function localMs(date, minute, offsetMinutes) {
  return Date.parse(`${date}T00:00:00.000Z`) - offsetMinutes * 60000 + minute * 60000;
}

function toClock(minute) {
  const h = String(Math.floor(minute / 60)).padStart(2, "0");
  const m = String(minute % 60).padStart(2, "0");
  return `${h}:${m}:00`;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}