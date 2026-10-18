import { dateLabel } from "@/lib/personal/dates";
import {
  SELF_COLORS,
  OTHER_COLORS,
  level,
  monthBorder,
} from "@/lib/pair/presentation";
import { CalendarLegend, Weekdays } from "@/components/personal/CalendarLegend";
export function PairCalendar({ share, selectedDate, onSelect }) {
  const padding = new Date(share.days[0].date + "T00:00:00Z").getUTCDay();
  const candidates = new Set(share.candidates.map((c) => c.date));
  return (
    <section className="personal-panel pair-month">
      <h2>
        多忙度マップ{" "}
        <span className="period-label">
          {dateLabel(share.days[0].date)} — {dateLabel(share.days.at(-1).date)}
        </span>
      </h2>
      <CalendarLegend pair />
      <Weekdays />
      <div className="month-grid">
        {Array.from({ length: padding }, (_, i) => (
          <span key={"pad" + i} />
        ))}
        {share.days.map((day) => (
          <button
            type="button"
            key={day.date}
            className={
              "pair-day" + (selectedDate === day.date ? " selected" : "")
            }
            style={{
              "--self-color": SELF_COLORS[level(day.self.busyRatio)],
              "--other-color": OTHER_COLORS[level(day.other.busyRatio)],
              "--month-border": monthBorder(day.date),
            }}
            aria-pressed={selectedDate === day.date}
            aria-label={
              dateLabel(day.date) +
              " 自分の多忙度" +
              Math.round(day.self.busyRatio * 100) +
              "% 相手の多忙度" +
              Math.round(day.other.busyRatio * 100) +
              "%" +
              (candidates.has(day.date) ? " 候補日" : "")
            }
            onClick={() => onSelect(day.date)}
          >
            <span className="pair-date">{Number(day.date.slice(8))}</span>
            {(day.date === share.today || day.date.endsWith("-01")) && (
              <span className="pair-month-badge">
                {Number(day.date.slice(5, 7))}月
              </span>
            )}
            {candidates.has(day.date) && (
              <span className="pair-candidate">★</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
