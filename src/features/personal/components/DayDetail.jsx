import { dateLabel } from "@/domain/schedule/dates";
import { Timeline } from "@/shared/ui/schedule/Timeline";
export function DayDetail({ day, today, window, excluded, onExclude }) {
  const content = (
    <>
      {day.allDayCount > 0 && (
        <p className="all-day-note">終日予定あり（{day.allDayCount}件）</p>
      )}
      <Timeline
        people={[{ key: "self", label: "自分", periods: day.periods }]}
        window={window}
      />
    </>
  );
  return (
    <section className="personal-panel day-panel" aria-label="選択日の詳細">
      <h2 className="desktop-selected-title">SELECTED DAY</h2>
      <p className="schedule-date">{dateLabel(day.date)}の予定</p>
      <p className="schedule-summary">
        多忙度：{Math.round(day.busyRatio * 100)}%
      </p>
      <div className="solo-meter">
        <span>自分</span>
        <div>
          <i style={{ width: day.busyRatio * 100 + "%" }} />
        </div>
        <b>{Math.round(day.busyRatio * 100)}%</b>
      </div>
      <div className="desktop-timeline timeline-card">{content}</div>
      <details className="mobile-timeline">
        <summary>時間帯の詳細を見る</summary>
        {content}
      </details>
      <details className="day-options">
        <summary>候補日の設定</summary>
        <button
          type="button"
          className="secondary-button exclude-button"
          disabled={day.date <= today}
          onClick={onExclude}
        >
          {excluded ? "候補からの除外を解除" : "この日を候補から除外"}
        </button>
        <p className="fine-print">
          終日予定は1日6時間換算。時間帯には割り当てません。除外設定は再読み込みすると戻ります。
        </p>
      </details>
    </section>
  );
}
