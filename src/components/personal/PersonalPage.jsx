import { useMemo, useState } from "react";
import { recommendForDetails } from "@/lib/personal/candidates";
import { MonthMap } from "./MonthMap";
import { DayDetail } from "./DayDetail";
import { Candidates } from "./Candidates";

export function PersonalPage({ data }) {
  const [selectedDate, setSelectedDate] = useState(data.today);
  const [detailOpen, setDetailOpen] = useState(false);
  const [excluded, setExcluded] = useState([]);
  const [shortcut, setShortcut] = useState("");
  const [showCandidates, setShowCandidates] = useState(false);
  const day = data.details.find((d) => d.date === selectedDate);
  const candidates = useMemo(
    () =>
      recommendForDetails(data.daily, data.details, data.today, excluded)
        .candidates,
    [data, excluded],
  );
  const signature = candidates.map((c) => c.date).join(",");
  function changeShortcut(value) {
    setShortcut(value);
    setShowCandidates(
      ["りすけ", "リスケ", "risuke"].includes(value.trim().toLowerCase()),
    );
  }
  function toggleExclusion() {
    setExcluded((dates) =>
      dates.includes(selectedDate)
        ? dates.filter((date) => date !== selectedDate)
        : [...dates, selectedDate],
    );
  }
  return (
    <>
      <section className="personal-panel shortcut-panel">
        <h2>ショートカット入力</h2>
        <label className="sr-only" htmlFor="risuke-shortcut">
          ショートカット入力
        </label>
        <input
          id="risuke-shortcut"
          placeholder="ここに入力（例: りすけ）"
          value={shortcut}
          maxLength={40}
          onChange={(e) => changeShortcut(e.target.value)}
        />
        <p className="hint">
          ヒント：「りすけ」と入力すると、空き時間が多い上位3日を即座に提示します。
        </p>
      </section>
      {showCandidates && (
        <Candidates
          key={signature}
          candidates={candidates}
          details={data.details}
        />
      )}
      <div className="calendar-layout">
        <MonthMap
          daily={data.daily}
          today={data.today}
          selectedDate={selectedDate}
          excluded={excluded}
          onSelect={setSelectedDate}
        />
        <div className="schedule-wrapper">
          {detailOpen ? (
            <DayDetail
              day={day}
              today={data.today}
              window={data.activityWindow}
              excluded={excluded.includes(selectedDate)}
              onExclude={toggleExclusion}
              onClose={() => setDetailOpen(false)}
            />
          ) : (
            <button
              type="button"
              className="secondary-button detail-prompt"
              onClick={() => setDetailOpen(true)}
            >
              選択日のスケジュール
            </button>
          )}
        </div>
      </div>
      <p className="fine-print source-note">
        テストデータ：今日から31日間・日本時間（Asia/Tokyo）・活動時間09:00–22:00。予定の保存・Google接続・LINE送信は行いません。
      </p>
    </>
  );
}
