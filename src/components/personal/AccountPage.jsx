import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
const labels = {
  configuration_missing: "Base44のConnector IDが未設定です。",
  configuration_invalid:
    "Connector IDの形式を確認してください。GoogleのOAuthクライアントIDとは別です。",
  connection_unconfirmed:
    "接続は未確認です。未連携の場合は接続を開始できます。設定したConnector IDも確認してください。",
  connected:
    "Google Calendarの接続を確認しました。予定の取得・保存・共有はまだ行っていません。",
  unavailable:
    "接続状態を確認できませんでした。設定や通信状態を確認して再試行してください。",
};
export function AccountPage({ status }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
    <section className="personal-panel">
      <h2>アカウントとデータ連携</h2>
      <p>本人のログインを確認しました。</p>
      <h3>Google Calendar</h3>
      <p>{labels[status.state]}</p>
      {status.state === "connection_unconfirmed" && (
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={connect}
        >
          {busy ? "接続を開始中…" : "Google Calendarを接続"}
        </button>
      )}
      <button
        type="button"
        className="secondary-button"
        onClick={() => router.invalidate()}
      >
        接続状態を再確認
      </button>
      <p role="status">{error}</p>
      <p className="fine-print">
        ログインとGoogleの閲覧許可は別の手順です。LINE紐付け・グループ共有同意・予定保存は準備中です。接続しただけで予定が共有されることはありません。
      </p>
      <button type="button" className="secondary-button" onClick={logout}>
        ログアウト
      </button>
    </section>
  );
}
