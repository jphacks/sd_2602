import { clock } from "@/domain/schedule/dates";
// Display hours are independent of the approved scoring/activity window.
export function Timeline({ people, window }) {
  return (
    <div className="schedule-timeline">
      <p className="mobile-hours-note">
        予定の表示対象：{clock(window.startMinute)}〜{clock(window.endMinute)}
        。対象外の時間は未評価です。
      </p>
      <div className="timeline-lanes" style={{ "--people": people.length }}>
        <div className="lane-hours">
          {Array.from({ length: 20 }, (_, i) => (
            <time key={i} style={{ top: i * 36 }}>
              {clock(300 + i * 60)}
            </time>
          ))}
        </div>
        {people.map((person) => (
          <div
            className="schedule-lane"
            key={person.key}
            aria-label={person.label + "の時間帯"}
          >
            {person.periods.map((period, i) => (
              <div
                key={i}
                className={"lane-event " + person.key}
                style={{
                  top: (period.startMinute - 300) * 0.6,
                  height: (period.endMinute - period.startMinute) * 0.6,
                }}
              >
                <b>
                  {clock(period.startMinute)}〜{clock(period.endMinute)}
                </b>
                <span>予定あり</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hourly-timeline">
        <div className="timeline-columns" style={{ "--people": people.length }}>
          <span />
          {people.map((p) => (
            <strong key={p.key} className={p.key}>
              {p.label}
            </strong>
          ))}
        </div>
        {Array.from({ length: 19 }, (_, i) => 300 + i * 60).map((start) => {
          const active =
            start >= window.startMinute && start < window.endMinute;
          return (
            <div
              className="timeline-hour"
              style={{ "--people": people.length }}
              key={start}
            >
              <time>{clock(start)}</time>
              {people.map((person) => (
                <div key={person.key} className="timeline-hour-content">
                  {active ? (
                    person.periods
                      .filter(
                        (p) =>
                          p.startMinute < start + 60 && p.endMinute > start,
                      )
                      .map((p, i) => (
                        <span key={i} className={"event-tag " + person.key}>
                          {clock(Math.max(start, p.startMinute))}〜
                          {clock(Math.min(start + 60, p.endMinute))}
                          <br />
                          予定あり
                        </span>
                      ))
                  ) : (
                    <span className="outside-hours">活動時間外</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        <div className="timeline-hour end-hour">
          <time>24:00</time>
        </div>
      </div>
    </div>
  );
}
