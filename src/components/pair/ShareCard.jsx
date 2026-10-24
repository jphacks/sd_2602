import { useEffect, useState } from "react";
import { calendarPng } from "@/lib/pair/image";
import { shortSchedule } from "@/lib/pair/share";
import { dateLabel } from "@/domain/schedule/dates";
export function ShareCard({ share, selectionKey = share.version }) {
  const [image, setImage] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      url;
    calendarPng(share)
      .then((blob) => {
        if (active) {
          url = URL.createObjectURL(blob);
          setImage(url);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "画像を生成できませんでした。画面を再読み込みしてください。",
          );
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [share, selectionKey]);
  return (
    <section className="personal-panel">
      <div className="pair-share-card">
        {image ? (
          <img src={image} alt="2人の多忙度を上下で比較した月間カレンダー" />
        ) : (
          <p role="status">{error || "月間画像を生成しています…"}</p>
        )}
        <div className="pair-card-body">
          {share.candidates.map((c) => (
            <div key={c.date}>
              <h3>{dateLabel(c.date)}</h3>
              <p>自分：{shortSchedule(c.self)}</p>
              <p>相手：{shortSchedule(c.other)}</p>
            </div>
          ))}
          {!share.candidates.length && <p>条件に合う候補日がありません。</p>}
        </div>
      </div>
      {image && (
        <a
          className="primary-button pair-download"
          href={image}
          download={
            "risuke-calendar-" +
            share.version +
            "-" +
            share.candidates.map((c) => c.date).join("_") +
            ".png"
          }
        >
          カード用の月間画像を保存
        </a>
      )}
      <p className="fine-print">
        画像はこの比較結果の記録です。更新すると新しい画像になります。現在は端末へのPNG保存のみで、LINE送信・オンライン保存は未接続です。
      </p>
    </section>
  );
}
