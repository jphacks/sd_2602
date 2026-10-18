import { useState } from "react";
import { dateLabel } from "@/lib/personal/dates";
import { candidateMessage } from "@/lib/personal/message";
import { shortSchedule } from "@/lib/pair/share";
import { MessageComposer } from "./MessageComposer";
export function Candidates({ candidates, details }) {
  const [selected, setSelected] = useState([]),
    [edited, setEdited] = useState(null);
  const message = edited ?? (selected.length ? candidateMessage(selected) : "");
  function toggle(date) {
    setSelected((ds) =>
      ds.includes(date) ? ds.filter((d) => d !== date) : [...ds, date],
    );
    setEdited(null);
  }
  return (
    <section
      className="personal-panel candidate-section"
      aria-label="おすすめ候補日"
    >
      <h2>多忙度の低いおすすめ候補日</h2>
      <p className="candidate-hint">タップして候補を選択（複数可）</p>
      {!candidates.length ? (
        <p role="status">
          条件に合う候補日がありません。除外日を見直してください。
        </p>
      ) : (
        <div className="candidate-grid">
          {candidates.map((c) => {
            const day = details.find((d) => d.date === c.date);
            return (
              <button
                type="button"
                className={
                  "candidate-card" +
                  (selected.includes(c.date) ? " is-picked" : "")
                }
                key={c.date}
                aria-pressed={selected.includes(c.date)}
                onClick={() => toggle(c.date)}
              >
                <span className="candidate-check" aria-hidden="true">
                  {selected.includes(c.date) ? "✓" : ""}
                </span>
                <h3>{dateLabel(c.date)}</h3>
                <p className="events">
                  {shortSchedule({ ...day, allDay: day.allDayCount > 0 })}
                </p>
              </button>
            );
          })}
        </div>
      )}
      <MessageComposer
        id="candidate-message"
        message={message}
        onChange={setEdited}
        count={selected.length}
      />
    </section>
  );
}
