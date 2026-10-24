import { dateLabel } from "@/domain/schedule/dates";

import { CalendarLegend, Weekdays } from "@/shared/ui/schedule/CalendarLegend";
const monthColors = [
  "#f472b6",
  "#fb7185",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#38bdf8",
  "#818cf8",
  "#FA33BB",
  "#A855F7",
  "#c084fc",
];
export function busyLevel(ratio) {
  return ratio >= 0.7 ? 3 : ratio >= 0.4 ? 2 : ratio >= 0.15 ? 1 : 0;
}

export function MonthMap({ daily, today, selectedDate, excluded, onSelect }) {
  const padding = new Date(daily[0].date + "T00:00:00Z").getUTCDay();
  return (
    <section className="personal-panel month-panel">
      <h2>
        多忙度マップ{" "}
        <span className="period-label">
          {dateLabel(daily[0].date)} — {dateLabel(daily.at(-1).date)}
        </span>
      </h2>
      <CalendarLegend />
      <Weekdays />
      <div className="month-grid">
        {Array.from({ length: padding }, (_, i) => (
          <span key={"pad-" + i} />
        ))}
        {daily.map((day) => {
          const month = Number(day.date.slice(5, 7));
          const date = Number(day.date.slice(8));
          return (
            <button
              type="button"
              key={day.date}
              className={
                "calendar-day level-" +
                busyLevel(day.busyRatio) +
                (selectedDate === day.date ? " is-selected" : "") +
                (month === 11 && date === 1 ? " special-nov1" : "")
              }
              style={{ "--month-border": monthColors[month - 1] }}
              aria-pressed={selectedDate === day.date}
              aria-label={
                dateLabel(day.date) +
                " 多忙度" +
                Math.round(day.busyRatio * 100) +
                "%" +
                (excluded.includes(day.date) ? " 候補から除外中" : "")
              }
              onClick={() => onSelect(day.date)}
            >
              {(day.date === today || date === 1) && (
                <small className="month-label">{month}月</small>
              )}
              <span className="day-number">{date}</span>
              {day.date === today ? (
                <small className="today-marker">今日</small>
              ) : excluded.includes(day.date) ? (
                <small className="excluded-marker">除外</small>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
