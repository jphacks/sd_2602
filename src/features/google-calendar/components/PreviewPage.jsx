import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getGooglePreview } from "@/features/google-calendar/server/preview-rpc";
import { PersonalPage } from "@/features/personal/components/PersonalPage";
const choices = [
  ["success", "予定あり"],
  ["empty", "予定0件"],
  ["failure", "読込失敗"],
];
export function PreviewPage({ initial }) {
  const [result, setResult] = useState(initial),
    [busy, setBusy] = useState(false),
    [scenario, setScenario] = useState("success");
  const read = useServerFn(getGooglePreview);
  async function change(value) {
    setBusy(true);
    setResult(null);
    setScenario(value);
    try {
      setResult(await read({ data: { scenario: value } }));
    } catch {
      setResult({ state: "failed", code: "PREVIEW_LOAD_FAILED" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="personal-panel">
        <h2>連携プレビュー（固定データ）</h2>
        <p>
          Google形式のテスト予定で、一覧・詳細・候補を確認できます。本人のGoogle接続・実予定の取得は行いません。
        </p>
        <div role="group" aria-label="確認する状態">
          {choices.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="secondary-button"
              disabled={busy}
              aria-pressed={scenario === value}
              onClick={() => change(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status">
          {busy
            ? "読み込み中…"
            : result?.state === "ready"
              ? scenario === "empty"
                ? "取得成功：予定0件です。空き時間から候補を選出します。"
                : "取得成功：固定予定を表示しています。"
              : "読込に失敗しました。途中の結果や以前の候補は表示していません。"}
        </p>
        <Link to="/account" className="secondary-button">
          本人用のGoogle接続へ
        </Link>
      </section>
      {result?.state === "ready" && (
        <PersonalPage
          key={scenario + result.data.generatedAt}
          data={result.data}
        />
      )}
    </>
  );
}
