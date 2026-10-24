import { useMemo, useState } from "react";
import { recommendForDetails } from "@/domain/schedule/candidates";
import { MonthMap } from "./MonthMap";
import { DayDetail } from "./DayDetail";
import { Candidates } from "./Candidates";
export function PersonalPage({ data }) {
  const [selectedDate, setSelectedDate] = useState(data.today),
    [excluded, setExcluded] = useState([]),
    [showCandidates, setShowCandidates] = useState(false);
  const day = data.details.find((d) => d.date === selectedDate);
  const candidates = useMemo(
    () =>
      recommendForDetails(
        data.daily,
        data.details,
        data.today,
        excluded,
        data.activityWindow,
      )
        .candidates.slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data, excluded],
  );
  function toggleExclusion() {
    setExcluded((ds) =>
      ds.includes(selectedDate)
        ? ds.filter((d) => d !== selectedDate)
        : [...ds, selectedDate],
    );
  }
  return (
    <>
      <div className="calendar-layout">
        <MonthMap
          daily={data.daily}
          today={data.today}
          selectedDate={selectedDate}
          excluded={excluded}
          onSelect={setSelectedDate}
        />
        <div className="schedule-wrapper">
          <DayDetail
            day={day}
            today={data.today}
            window={data.activityWindow}
            excluded={excluded.includes(selectedDate)}
            onExclude={toggleExclusion}
          />
        </div>
      </div>
      <section className="personal-panel find-panel">
        <h2>候補日を探す</h2>
        <button
          className="primary-button find-button"
          type="button"
          onClick={() => setShowCandidates(true)}
        >
          おすすめの候補日を探す
        </button>
        <p className="hint">空きが多い日を3つ提案します</p>
      </section>
      {showCandidates && (
        <Candidates
          key={candidates.map((c) => c.date).join(",")}
          candidates={candidates}
          details={data.details}
        />
      )}
      <details className="test-info">
        <summary>
          {data.source === "google-preview"
            ? "プレビューについて"
            : data.source === "google"
              ? "取得データについて"
              : "テストデータ・連携について"}
        </summary>
        <p className="fine-print">
          {data.source === "google-preview"
            ? "Google形式の固定応答を共通の変換・演算で処理したプレビューです。実予定ではありません。31日分・日本時間・活動時間09:00〜22:00。"
            : data.source === "google"
              ? "Googleのメインカレンダーを取得した時点の31日分・日本時間・活動時間09:00〜22:00。承諾済みまたは本人主催の予定を評価します。保存・自動更新・LINE共有は行いません。"
              : "今日から31日間・日本時間・活動時間09:00〜22:00。固定テストデータです。予定の保存・LINE送信は未接続です。"}
        </p>
      </details>
    </>
  );
}
