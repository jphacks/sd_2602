import { clock, dateLabel } from "@/lib/personal/dates";

export function DayDetail({
  day,
  today,
  window,
  excluded,
  onExclude,
  onClose,
}) {
  return (
    <section className="personal-panel day-panel" aria-label="選択日の詳細">
      <div className="section-heading">
        <h2>SELECTED DAY</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="日別詳細を閉じる"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="schedule-date">
        {day.date.slice(0, 4)}年{dateLabel(day.date)}
      </p>
      <p className="schedule-summary">
        多忙度: {Math.round(day.busyRatio * 100)}%
      </p>
      {day.allDayCount > 0 && (
        <div className="all-day-note">
          <strong>終日予定あり（{day.allDayCount}件）</strong>
          <p>
            日別は件数によらず6時間換算。空き時間は要確認です。時間帯には割り当てません。
          </p>
        </div>
      )}
      {day.periods.length > 0 && (
        <p className="period-list">
          予定：
          {day.periods
            .map((p) => clock(p.startMinute) + "〜" + clock(p.endMinute))
            .join("、")}
        </p>
      )}
      <h3>時間帯別の空き状況</h3>
      <p className="fine-print">
        活動時間 {clock(window.startMinute)}–{clock(window.endMinute)}
        {day.allDayCount
          ? "。終日予定を除く集計です。予定のない枠も空きの確定を意味しません。"
          : ""}
      </p>
      <div className="timeline">
        {day.slots.map((slot) => (
          <div className="time-row" key={slot.slotStart}>
            <time>{slot.slotStart.slice(11, 16)}</time>
            <span className={slot.busyMinutes ? "has-event" : "empty"}>
              {slot.busyMinutes
                ? "予定あり（" + slot.busyMinutes + "分）"
                : "予定なし"}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="secondary-button exclude-button"
        disabled={day.date <= today}
        onClick={onExclude}
      >
        {excluded ? "候補からの除外を解除" : "この日を候補から除外"}
      </button>
      <p className="fine-print">
        今日・過去日は候補に含めません。除外はこのページ内のみで、再読込すると戻ります。
      </p>
    </section>
  );
}
