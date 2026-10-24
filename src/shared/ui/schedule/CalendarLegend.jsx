import { SELF_COLORS, OTHER_COLORS } from "@/features/pair/presentation";
export function CalendarLegend({ pair = false }) {
  return (
    <div className="calendar-legend-wrap">
      {(pair
        ? [
            ["上側（自分）:", SELF_COLORS],
            ["下側（相手）:", OTHER_COLORS],
          ]
        : [["多忙度：", SELF_COLORS]]
      ).map(([label, colors]) => (
        <div className="calendar-legend" key={label}>
          <strong>{label}</strong>
          {["空き", "余裕", "普通", "多忙"].map((text, i) => (
            <span key={text}>
              <i
                style={{
                  background: colors[i],
                  border: i === 0 ? "1px solid #e2e8f0" : undefined,
                }}
              />
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
export function Weekdays() {
  return (
    <div className="calendar-weekdays" aria-hidden="true">
      {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
        <span key={d}>{d}</span>
      ))}
    </div>
  );
}
