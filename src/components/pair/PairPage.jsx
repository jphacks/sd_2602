import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { shareMessage, shortSchedule, selectShare } from "@/lib/pair/share";
import { dateLabel } from "@/lib/personal/dates";
import { updatedLabel } from "@/lib/pair/presentation";
import { MessageComposer } from "@/shared/ui/schedule/MessageComposer";
import { PairCalendar } from "./PairCalendar";
import { PairDetail } from "./PairDetail";
import { ShareCard } from "./ShareCard";
import "./pair.css";
export function PairPage({ share }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(share.today),
    [selected, setSelected] = useState([]),
    [showCandidates, setShowCandidates] = useState(false),
    [edited, setEdited] = useState(null),
    [status, setStatus] = useState(""),
    [updating, setUpdating] = useState(false);
  const selectedShare = useMemo(
    () => selectShare(share, selected),
    [share, selected],
  );
  const selectionKey =
    share.version + ":" + selectedShare.candidates.map((c) => c.date).join(",");
  const day = share.days.find((d) => d.date === selectedDate),
    candidate = share.candidates.find((c) => c.date === selectedDate);
  const message =
    edited ?? (selected.length ? shareMessage(share, selected) : "");
  async function refresh() {
    setUpdating(true);
    try {
      await router.invalidate();
    } catch {
      setStatus("更新できませんでした。再試行してください。");
    } finally {
      setUpdating(false);
    }
  }
  return (
    <>
      <div className="calendar-layout">
        <PairCalendar
          share={share}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
        <div className="schedule-wrapper">
          <PairDetail
            key={selectedDate}
            day={day}
            candidate={candidate}
            window={share.activityWindow}
          />
        </div>
      </div>
      <section className="personal-panel find-panel">
        <h2>候補日を探す</h2>
        <button
          type="button"
          className="primary-button find-button"
          onClick={() => setShowCandidates(true)}
        >
          おすすめの候補日を探す
        </button>
        <p className="hint">お互いの空きが多い日を3つ提案します</p>
      </section>
      {showCandidates && (
        <section className="personal-panel candidate-section">
          <h2>お互いの予定を考慮したおすすめ候補日</h2>
          <p className="candidate-hint">タップして候補を選択（複数可）</p>
          {!share.candidates.length ? (
            <p>条件に合う候補日がありません。</p>
          ) : (
            <div className="candidate-grid">
              {share.candidates.map((c) => (
                <button
                  className={
                    "candidate-card" +
                    (selected.includes(c.date) ? " is-picked" : "")
                  }
                  type="button"
                  key={c.date}
                  aria-pressed={selected.includes(c.date)}
                  onClick={() => {
                    setSelected((ds) =>
                      ds.includes(c.date)
                        ? ds.filter((d) => d !== c.date)
                        : [...ds, c.date],
                    );
                    setEdited(null);
                  }}
                >
                  <span className="candidate-check" aria-hidden="true">
                    {selected.includes(c.date) ? "✓" : ""}
                  </span>
                  <h3>{dateLabel(c.date)}</h3>
                  <p className="events">自分：{shortSchedule(c.self)}</p>
                  <p className="events">相手：{shortSchedule(c.other)}</p>
                </button>
              ))}
            </div>
          )}
          <MessageComposer
            id="pair-message"
            message={message}
            onChange={setEdited}
            count={selected.length}
          />
        </section>
      )}
      <details className="image-disclosure">
        <summary>共有カードのプレビュー・画像保存</summary>
        {selected.length ? (
          <ShareCard
            key={selectionKey}
            share={selectedShare}
            selectionKey={selectionKey}
          />
        ) : (
          <p className="fine-print">共有する候補日を選択してください。</p>
        )}
      </details>
      <details className="test-info">
        <summary>テストデータ・連携について</summary>
        <p className="fine-print">
          テストの2人の予定です。更新 {updatedLabel(share.generatedAt)}
          （日本時間）。活動時間09:00〜22:00。終日予定は1日6時間換算し、候補日からは除外します。候補日のみ双方の予定時間帯を共有します。本人認証・Google実予定・LINE実連携・オンライン画像保存は未接続です。
        </p>
        <button
          type="button"
          className="secondary-button"
          disabled={updating}
          onClick={refresh}
        >
          {updating ? "更新中…" : "比較データを更新"}
        </button>
        <p role="status">{status}</p>
      </details>
    </>
  );
}
