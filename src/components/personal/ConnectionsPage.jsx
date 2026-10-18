import { Link } from "@tanstack/react-router";

export function ConnectionsPage() {
  return (
    <>
      <div className="personal-intro">
        <p className="eyebrow">CONNECTIONS</p>
        <h1>予定をつなぐ、その前に。</h1>
        <p>データ連携の流れを確認して、テスト予定で使い心地を試せます。</p>
      </div>
      <section className="personal-panel connection-card">
        <div className="section-heading">
          <h2>Google Calendar</h2>
          <span className="status-pill">実接続の確認前</span>
        </div>
        <p>
          利用者ごとのGoogle接続設定とConnector
          IDはBase44に登録済みです。本人の認可と実予定取得の通し確認はこれから行います。テスト画面は実予定を読み取りません。
        </p>
        <Link className="primary-button" to="/account">
          ログインして接続状態を確認
        </Link>
        <ol className="connection-steps">
          <li>
            <b>1</b>
            <div>
              <strong>データ連携を選ぶ</strong>
              <p>この画面から接続方法を確認します。</p>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <strong>Googleで閲覧を許可する</strong>
              <p>
                本人用画面からGoogle認可を開始し、予定を読み込めます。実接続は検証前です。
              </p>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>一覧・詳細・候補を確認する</strong>
              <p>
                固定応答のプレビューで、一覧・詳細・候補への受け渡しを確認できます。
              </p>
            </div>
          </li>
        </ol>
        <Link className="primary-button" to="/me/preview">
          連携プレビューを開く <span aria-hidden="true">→</span>
        </Link>
        <p className="fine-print">
          この操作でGoogle連携済みにはなりません。実際の予定やアカウント情報は取得しません。
        </p>
      </section>
      <section className="personal-panel roadmap">
        <p className="eyebrow">COMING NEXT</p>
        <h2>今後の開発予定</h2>
        <ul>
          <li>Google Calendarの実認可・再認可の通し確認と連携解除</li>
          <li>ローカルとBase44プレビューの認証・設定参照の確認</li>
          <li>実予定取得の検証と更新操作の確認</li>
          <li>完成した計算結果の保存とLINE共有への接続</li>
        </ul>
      </section>
    </>
  );
}
