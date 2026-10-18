import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { readGoogleSchedule } from "@/lib/account/server";
import { PersonalPage } from "./PersonalPage";
const labels = {
  configuration_missing: "Base44のConnector IDが未設定です。",
  configuration_invalid:
    "Connector IDの形式を確認してください。GoogleのOAuthクライアントIDとは別です。",
  connection_unconfirmed:
    "接続は未確認です。未連携の場合は接続を開始できます。設定したConnector IDも確認してください。",
  connected:
    "Google Calendarの接続を確認しました。ボタンから本人のメインカレンダーを読み込めます。",
  unavailable:
    "接続状態を確認できませんでした。設定や通信状態を確認して再試行してください。",
};
export function AccountPage({ status }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [schedule, setSchedule] = useState(null);
  const readSchedule = useServerFn(readGoogleSchedule);
  async function load() {
    setBusy(true);
    setError("");
    setSchedule(null);
    try {
      const result = await readSchedule();
      if (result.state === "ready") setSchedule(result.data);
      else setError(calendarError(result));
    } catch {
      setError("読み込めませんでした。ログインと通信状態を確認してください。");
    } finally {
      setBusy(false);
    }
  }
  const router = useRouter(),
    { logout } = useAuth();
  async function connect() {
    setBusy(true);
    setError("");
    try {
      const destination = await base44.connectors.connectAppUser(
        status.connectorId,
      );
      const url = new URL(destination);
      if (url.protocol !== "https:") throw new Error("INVALID_OAUTH_URL");
      window.location.assign(url.href);
    } catch {
      setError(
        "接続を開始できませんでした。設定を確認して再試行してください。",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <section className="personal-panel">
        <h2>アカウントとデータ連携</h2>
        <p>本人のログインを確認しました。</p>
        <h3>Google Calendar</h3>
        <p>{labels[status.state]}</p>
        {["connection_unconfirmed", "connected"].includes(status.state) && (
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={connect}
          >
            {status.state === "connected"
              ? "Google Calendarを再接続"
              : "Google Calendarを接続"}
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            setSchedule(null);
            router.invalidate();
          }}
        >
          接続状態を再確認
        </button>
        {status.state === "connected" && (
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={load}
          >
            {busy ? "予定を読み込み中…" : "Googleの予定を読み込む"}
          </button>
        )}
        <p role="status">{error}</p>
        <p className="fine-print">
          メインカレンダーの今日から31日分のみ。画面を離れると再読込が必要です。DB保存・相手との共有は行いません。
        </p>
        <p className="fine-print">
          ログインとGoogleの閲覧許可は別の手順です。LINE紐付け・グループ共有同意・予定保存は準備中です。接続しただけで予定が共有されることはありません。
        </p>
        <button type="button" className="secondary-button" onClick={logout}>
          ログアウト
        </button>
      </section>
      {schedule && <PersonalPage key={schedule.generatedAt} data={schedule} />}
    </>
  );
}

function calendarError(result) {
  const messages = {
    GOOGLE_RECONNECT:
      "Googleの認可を確認してください。再接続が必要な可能性があります。",
    GOOGLE_FORBIDDEN:
      "Google Calendar APIの有効化・閲覧権限を確認してください。",
    GOOGLE_RATE_LIMIT:
      "Googleへのアクセスが集中しています。時間をおいて再試行してください。",
    GOOGLE_NETWORK: "Googleとの通信が完了しませんでした。再試行してください。",
    CONNECTION_UNCONFIRMED: "Google接続とConnector IDを確認してください。",
    CONNECTOR_UNAVAILABLE: "Base44の接続情報を取得できませんでした。",
    configuration_missing: "Connector IDが未設定です。",
    configuration_invalid: "Connector IDの設定を確認してください。",
  };
  return (
    messages[result.code ?? result.state] ??
    "全予定の読込を完了できなかったため、候補を表示していません。設定と通信状態を確認してください。"
  );
}
