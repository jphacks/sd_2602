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
          GoogleのOAuth設定は登録済みとのご申告があります。利用者ごとの接続にはBase44のConnector
          IDが必要です。テスト画面はログイン不要で、実予定を読み取りません。
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
              <strong>
                Googleで閲覧を許可する <small>今後実装予定</small>
              </strong>
              <p>
                本人の同意を得て、カレンダーを読み取る工程を追加する予定です。
              </p>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>一覧・詳細・候補を確認する</strong>
              <p>現在は、この先の体験をテストデータで試せます。</p>
            </div>
          </li>
        </ol>
        <Link className="primary-button" to="/me">
          テストデータで試す <span aria-hidden="true">→</span>
        </Link>
        <p className="fine-print">
          この操作でGoogle連携済みにはなりません。実際の予定やアカウント情報は取得しません。
        </p>
      </section>
      <section className="personal-panel roadmap">
        <p className="eyebrow">COMING NEXT</p>
        <h2>今後の開発予定</h2>
        <ul>
          <li>Google Calendarの利用者ごとの認可・キャンセル・再認可</li>
          <li>読み取り権限と認証情報の安全な保管</li>
          <li>実予定の全件取得・更新・連携解除</li>
          <li>完成した計算結果の保存とLINE共有への接続</li>
        </ul>
      </section>
    </>
  );
}
