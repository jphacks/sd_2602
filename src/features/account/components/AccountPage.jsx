import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { readGoogleSchedule } from "@/features/account/server";
import {
  startCalendarConnection,
  pendingCalendar,
  clearCalendarFlow,
} from "@/features/account/flow";
import { PersonalPage } from "@/features/personal/components/PersonalPage";

const labels = {
  configuration_missing: "Base44のConnector IDが未設定です。",
  configuration_invalid:
    "Connector IDの形式を確認してください。GoogleのOAuthクライアントIDとは別です。",
  connection_unconfirmed:
    "Google Calendarを接続すると、このページで本人の予定を自動で読み込みます。",
  connected:
    "Google Calendarの接続を確認しました。本人のメインカレンダーを自動で読み込みます。",
  unavailable:
    "接続状態を確認できませんでした。設定や通信状態を確認して再試行してください。",
};

export function AccountPage({ status }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [notice, setNotice] = useState("");
  const [framed, setFramed] = useState(null);
  const readSchedule = useServerFn(readGoogleSchedule);
  const router = useRouter();
  const { logout } = useAuth();

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

  useEffect(() => {
    setFramed(window !== window.parent);
  }, []);

  useEffect(() => {
    if (status.state !== "connected") setSchedule(null);
  }, [status.state]);

  // ログイン直後・接続確認後に、予定の取得まで自動で進める。
  useEffect(() => {
    if (status.state === "connected") load();
  }, [status.state]);

  useEffect(() => {
    try {
      if (pendingCalendar(window.sessionStorage)) {
        clearCalendarFlow(window.sessionStorage);
        setNotice(
          "Google画面から戻りました。接続状態を確認しました。未接続の場合は、許可のキャンセルや設定をご確認ください。",
        );
      }
    } catch {
      /* Storage is optional. */
    }
    let checking = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        await router.invalidate();
      } catch {
        setError("接続状態を更新できませんでした。再確認してください。");
      } finally {
        checking = false;
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  async function connect() {
    if (window !== window.parent) {
      setError("Googleの許可画面は別タブで開いてください。");
      return;
    }
    setBusy(true);
    setError("");
    setSchedule(null);
    try {
      await startCalendarConnection({
        connectorId: status.connectorId,
        connect: (id) => base44.connectors.connectAppUser(id),
        storage: window.sessionStorage,
        redirect: (url) => window.location.assign(url),
      });
    } catch {
      setError(
        "接続を開始できませんでした。設定を確認して再試行してください。",
      );
      setBusy(false);
    }
  }

  const canConnect = ["connection_unconfirmed", "connected"].includes(
    status.state,
  );

  if (status.state !== "connected") {
    return (
      <section className="personal-panel connection-card">
        <div className="section-heading">
          <h2>Google Calendar</h2>
          <span className="status-pill">未接続</span>
        </div>
        <p>{labels[status.state]}</p>
        {notice && <p role="status">{notice}</p>}
        {canConnect && framed && (
          <p>
            <a
              className="primary-button"
              href="/account"
              target="_blank"
              rel="noopener noreferrer"
            >
              別タブでGoogle接続画面を開く
            </a>
          </p>
        )}
        {canConnect && framed === false && (
          <p>
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={connect}
            >
              Google Calendarを接続
            </button>
          </p>
        )}
        {error && <p role="status">{error}</p>}
        <p className="fine-print">
          ログインとGoogleの閲覧許可は別の手順です。接続すると予定の取得まで自動で進みます。DB保存・共有は行いません。
        </p>
        <p>
          <button type="button" className="secondary-button" onClick={logout}>
            ログアウト
          </button>
        </p>
      </section>
    );
  }

  return (
    <>
      <details className="test-info">
        <summary>
          Google Calendar：
          {busy ? "予定を取得中…" : schedule ? "接続済み・取得済み" : "接続済み"}
        </summary>
        <p>{labels[status.state]}</p>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="status">{error}</p>}
        <p>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={load}
          >
            予定を再取得
          </button>{" "}
          {framed === false && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={connect}
            >
              Google Calendarを再接続
            </button>
          )}{" "}
          <button type="button" className="secondary-button" onClick={logout}>
            ログアウト
          </button>
        </p>
        <p className="fine-print">
          メインカレンダーの今日から31日分のみ。画面を離れると再読込が必要です。DB保存・相手との共有は行いません。
        </p>
      </details>
      {busy && !schedule && <p role="status">Googleの予定を取得しています…</p>}
      {error && !schedule && !busy && (
        <section className="personal-panel">
          <p>{error}</p>
          <p>
            <button type="button" className="primary-button" onClick={load}>
              再試行
            </button>
          </p>
        </section>
      )}
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
    GOOGLE_TIMEOUT:
      "Googleからの応答待ちが時間切れになりました。時間をおいて再試行してください。",
    GOOGLE_REDIRECT:
      "Google APIから想定外の転送応答があり、予定の取得を中止しました。",
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