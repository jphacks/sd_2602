import "@/components/pair/pair.css";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PairCalendar } from "@/components/pair/PairCalendar";
import { PairDetail } from "@/components/pair/PairDetail";
import { Candidates } from "@/components/personal/Candidates";
import bundle from "../../../base44/functions/line-card-demo/prepared.json";
export const Route = createFileRoute("/me/card-preview")({
  validateSearch: (search) => ({
    version: typeof search.version === "string" ? search.version : "",
  }),
  headers: () => ({ "Cache-Control": "no-store" }),
  component: Page,
});
function Page() {
  const { version } = Route.useSearch();
  const { record, imageBase64 } = bundle,
    share = record.share;
  const [date, setDate] = useState(share.today);
  if (version && version !== record.version)
    return (
      <section className="personal-panel">
        <h2>この版は確認できません</h2>
        <p>
          デモを更新したため、以前の版はこの固定ファイルには含まれていません。
        </p>
      </section>
    );
  const day = share.days.find((d) => d.date === date),
    candidate = share.candidates.find((c) => c.date === date);
  return (
    <>
      <section className="personal-panel">
        <h2>LINEカードの固定版プレビュー</h2>
        <p>
          架空データです。保存済みの同じ計算結果・画像を表示しています。実予定やDBには接続しません。
        </p>
        <p>版：{record.version}</p>
        <p>
          生成：{share.generatedAt} ／ 配信期限：{record.expiresAt}
        </p>
        <p>
          A・Bの取得時刻：{record.selfFetchedAt} ／ {record.otherFetchedAt}
        </p>
      </section>
      <div className="calendar-layout">
        <PairCalendar share={share} selectedDate={date} onSelect={setDate} />
        <div className="schedule-wrapper"><PairDetail
          day={day}
          candidate={candidate}
          window={share.activityWindow}
        /></div>
      </div>
      <Candidates
        candidates={share.candidates}
        details={share.candidates.map((c) => ({
          date: c.date,
          periods: c.self.periods,
          allDayCount: 0,
        }))}
      />
      <section className="personal-panel">
        <h2>事前生成したカード画像</h2>
        <img
          style={{ width: "100%", maxWidth: 732 }}
          src={"data:" + (record.image.contentType ?? "image/png") + ";base64," + imageBase64}
          alt="日付・2人の多忙度・候補の星を示す月画像"
        />
        <a
          className="primary-button"
          href={"data:" + (record.image.contentType ?? "image/png") + ";base64," + imageBase64}
          download={"risuke-" + record.version + (record.image.contentType === "image/jpeg" ? ".jpg" : ".png")}
        >
          画像を保存
        </a>
        <p>
          端末への保存は任意です。Botは事前生成済み画像を使います。候補選択はこの画面だけの下書きで、カードの版は変わりません。
        </p>
      </section>
    </>
  );
}
