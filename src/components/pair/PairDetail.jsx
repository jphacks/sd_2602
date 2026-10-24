import { useState } from "react";
import { dateLabel } from "@/lib/personal/dates";
import { Timeline } from "@/shared/ui/schedule/Timeline";
export function PairDetail({ day, candidate, window }) {
  const [timeline, setTimeline] = useState(false);
  const people = candidate
    ? [
        { key: "self", label: "自分", periods: candidate.self.periods },
        { key: "other", label: "相手", periods: candidate.other.periods },
      ]
    : [];
  return (
    <section className="personal-panel pair-day-panel">
      <h2 className="desktop-selected-title">SELECTED DAY</h2>
      <p className="schedule-date">{dateLabel(day.date)}の多忙度</p>
      {!timeline ? (
        <div className="pair-chart">
          <div
            className="pair-bars"
            onDoubleClick={() => candidate && setTimeline(true)}
          >
            {[
              ["self", "自分"],
              ["other", "相手"],
            ].map(([key, label]) => (
              <div className="pair-bar-column" key={key}>
                <div className="pair-bar-track">
                  <div
                    className={"pair-bar " + key}
                    style={{ height: day[key].busyRatio * 100 + "%" }}
                  />
                  <strong
                    style={{
                      bottom:
                        day[key].busyRatio >= 0.17
                          ? "calc(" + day[key].busyRatio * 100 + "% - 32px)"
                          : "calc(" + day[key].busyRatio * 100 + "% + 6px)",
                    }}
                  >
                    {Math.round(day[key].busyRatio * 100)}%
                  </strong>
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {candidate ? (
            <button
              className="detail-switch"
              type="button"
              onClick={() => setTimeline(true)}
            >
              時間帯の詳細を見る
            </button>
          ) : (
            <p className="fine-print">予定の時間帯は候補日のみ共有されます。</p>
          )}
        </div>
      ) : (
        <div className="timeline-card">
          <div className="timeline-header">
            <strong>お互いの予定</strong>
            <button
              className="back-button"
              type="button"
              onClick={() => setTimeline(false)}
            >
              ← グラフに戻る
            </button>
          </div>
          <Timeline people={people} window={window} />
        </div>
      )}
    </section>
  );
}
