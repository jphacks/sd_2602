import { useState } from "react";
import { clock, dateLabel } from "@/lib/personal/dates";
import { candidateMessage } from "@/lib/personal/message";

function describe(day) {
  if (day.allDayCount) return "終日予定あり・空き時間は要確認";
  return day.periods.length
    ? day.periods
        .map((p) => clock(p.startMinute) + "〜" + clock(p.endMinute))
        .join("、") + "に予定あり"
    : "活動時間内に時刻指定の予定なし";
}

export function Candidates({ candidates, details }) {
  const [selected, setSelected] = useState([]);
  const [edited, setEdited] = useState(null);
  const [copyState, setCopyState] = useState("");
  const message =
    edited ??
    (selected.length
      ? candidateMessage(selected)
      : "上の候補日カードをタップして選択してください。");
  function toggle(date) {
    setSelected((dates) =>
      dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date],
    );
    setEdited(null);
    setCopyState("");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("コピーしました！");
    } catch {
      setCopyState(
        "コピーできませんでした。文章を選択してコピーしてください。",
      );
    }
  }
  return (
    <section
      className="personal-panel candidate-section"
      aria-label="おすすめ候補日"
    >
      <h2>多忙度の低いおすすめ候補日</h2>
      <p className="candidate-hint">タップして候補を選択（複数可）</p>
      {!candidates.length ? (
        <p role="status" className="empty-state">
          条件に合う候補日がありません。除外日を見直してください。
        </p>
      ) : (
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <button
              type="button"
              className={
                "candidate-card" +
                (selected.includes(candidate.date) ? " is-picked" : "")
              }
              key={candidate.date}
              aria-pressed={selected.includes(candidate.date)}
              onClick={() => toggle(candidate.date)}
            >
              <h3>{dateLabel(candidate.date)}</h3>
              <p className="events">
                {describe(details.find((day) => day.date === candidate.date))}
              </p>
            </button>
          ))}
        </div>
      )}
      <label className="sr-only" htmlFor="candidate-message">
        案内文
      </label>
      <textarea
        id="candidate-message"
        value={message}
        disabled={!selected.length}
        onChange={(e) => {
          setEdited(e.target.value);
          setCopyState("");
        }}
      />
      <div className="copy-row">
        <button
          type="button"
          className="primary-button"
          disabled={!selected.length || !message.trim()}
          onClick={copy}
        >
          テキストをコピー
        </button>
        <span role="status">{copyState}</span>
      </div>
    </section>
  );
}
